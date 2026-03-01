/**
 * Ingestion orchestrator.
 * Walks source directories, detects file changes, and drives the full
 * extract → chunk → embed → upsert pipeline for each file.
 *
 * SUPPORTED EXTENSIONS: .txt, .md, .csv, .pdf, .png, .jpg, .jpeg
 * PDF strategy: try text extraction first; fall back to vision if text is sparse.
 * Images: always use vision pipeline.
 * Categories: resolved per-file from RagSource.categoryMappings.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ManifestEntry, IngestResult, IngestSummary, QdrantPoint, RagChunkPayload, ParentQdrantPoint, RagSource } from '@/models/rag';
import {
  readManifest,
  writeManifest,
  computeFileHash,
  getManifestEntry,
  setManifestEntry,
  removeManifestEntry,
} from './manifest';
import { extractTextFromFile, isTextSufficient } from './textExtractor';
import { extractFromImageFile, extractFromScannedPdf } from './visionExtractor';
import { extractAnimeRecords } from './animeDataExtractor';
import { chunkText } from './chunker';
import { embedBatch } from './embedder';
import { extractDocIdentifiers, buildIdentifierPrefix } from './docIdentifierExtractor';
import { extractStructuredData } from './structuredDataExtractor';
import {
  ensureCollection,
  upsertPoints,
  deletePoints,
  ensureParentCollection,
  upsertParents,
  deleteParents,
  parentsCollectionName as getParentsCollectionName,
} from './qdrantClient';
import { readRagConfig, resolveCategories } from './ragConfig';

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.pdf', '.png', '.jpg', '.jpeg']);

/** Returns the set of file extensions to index for a given source. */
function getSourceExtensions(source: RagSource): Set<string> {
  if (source.typeOfSource === 'animeData') {
    return new Set([...SUPPORTED_EXTENSIONS, '.json']);
  }
  return SUPPORTED_EXTENSIONS;
}

// ── File type detection ───────────────────────────────────────────────────────

function getFileType(filePath: string): 'pdf' | 'image' | 'text' {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return 'image';
  return 'text';
}

// ── Core extraction pipeline for one file ────────────────────────────────────

interface FileExtraction {
  segments: { text: string; page?: number }[];
  /**
   * When true, each segment is embedded as-is without further chunking.
   * Used for structured sources (animeData) where every segment is already
   * a complete, self-contained record.
   */
  skipChunking?: boolean;
}

async function extractFile(
  filePath: string,
  fileType: 'pdf' | 'image' | 'text',
  typeOfSource?: string,
): Promise<FileExtraction> {
  // Anime JSON: one natural-language segment per record, no chunking
  if (typeOfSource === 'animeData' && path.extname(filePath).toLowerCase() === '.json') {
    const records = extractAnimeRecords(filePath);
    return { segments: records.map(r => ({ text: r.text })), skipChunking: true };
  }

  if (fileType === 'text') {
    const { text } = await extractTextFromFile(filePath);
    return { segments: [{ text }] };
  }

  if (fileType === 'image') {
    const text = await extractFromImageFile(filePath);
    return { segments: [{ text }] };
  }

  // PDF: try text extraction first
  const extracted = await extractTextFromFile(filePath);
  if (isTextSufficient(extracted)) {
    return { segments: [{ text: extracted.text }] };
  }

  // Scanned PDF: per-page vision extraction
  const { pageTexts } = await extractFromScannedPdf(filePath, extracted.pages);
  return { segments: pageTexts.map((text, i) => ({ text, page: i + 1 })) };
}

// ── Ingest a single file ──────────────────────────────────────────────────────

async function ingestFile(
  filePath: string,
  contentHash: string,
  categories: string[],
  sourceLabel: string,
  collectionName: string,
  parentCol: string,
  typeOfSource?: string,
): Promise<{ chunkIds: string[]; chunksCreated: number; pages: number; parentId: string }> {
  await ensureCollection(collectionName);
  await ensureParentCollection(parentCol);
  const parentId = crypto.randomUUID();

  const fileType = getFileType(filePath);
  const fileName = path.basename(filePath);

  console.log(`[RAG ingest][${sourceLabel}] → Extracting: ${fileName}`);
  const extraction = await extractFile(filePath, fileType, typeOfSource);
  const pages = extraction.segments.length;

  const allChunks: { text: string; page?: number; index: number }[] = [];
  let globalIndex = 0;
  for (const segment of extraction.segments) {
    // skipChunking: embed each segment whole (e.g. one anime record = one vector)
    const texts = extraction.skipChunking ? [segment.text] : chunkText(segment.text);
    for (const text of texts) {
      allChunks.push({ text, page: segment.page, index: globalIndex++ });
    }
  }

  if (allChunks.length === 0) {
    console.log(`[RAG ingest][${sourceLabel}] ⚠ No text extracted from ${fileName}, skipping`);
    return { chunkIds: [], chunksCreated: 0, pages, parentId };
  }

  // Filter out junk chunks — calendar grids, page-number-only fragments, etc.
  // A chunk is junk if it has fewer than MIN_WORD_CHARS actual word characters (a-z letters).
  // This prevents noise like "\n08/02/21\n09/02/21\n..." from being indexed.
  const MIN_WORD_CHARS = 80;
  const usableChunks = allChunks.filter(c => (c.text.match(/[a-zA-ZÀ-ÿ]/g) ?? []).length >= MIN_WORD_CHARS);
  const junkCount = allChunks.length - usableChunks.length;
  if (junkCount > 0) {
    console.log(`[RAG ingest][${sourceLabel}] 🗑 Filtered ${junkCount} junk chunk(s) from ${fileName}`);
  }
  if (usableChunks.length === 0) {
    console.log(`[RAG ingest][${sourceLabel}] ⚠ All chunks were junk for ${fileName}, skipping`);
    return { chunkIds: [], chunksCreated: 0, pages, parentId };
  }

  // Generate embedding inputs.
  // Strategy: extract global document identifiers with ONE LLM call per file,
  // then prepend them to every chunk.  This is more accurate than per-chunk
  // context generation (which hallucinated amounts from context-free number columns)
  // and drastically faster (1 call vs N calls).
  //
  // Images and structured sources (skipChunking) already produce NL text — embed as-is.
  const needsIdentifiers = fileType !== 'image' && !extraction.skipChunking;
  let textsToEmbed: string[];
  let embeddedContexts: Array<string | undefined>;

  if (needsIdentifiers) {
    console.log(`[RAG ingest][${sourceLabel}] 🔍 Extracting document identifiers for ${fileName}…`);
    const docIds = await extractDocIdentifiers(usableChunks[0].text, fileName, categories);
    const prefix = buildIdentifierPrefix(docIds);
    textsToEmbed = usableChunks.map(c => `${prefix}\n${c.text}`);
    embeddedContexts = new Array(usableChunks.length).fill(prefix);

    const points: QdrantPoint[] = usableChunks.map((chunk, i) => ({
      id: crypto.randomUUID(),
      vector: (null as any), // filled below after embedBatch
      payload: {
        content: chunk.text,
        embeddedContext: prefix,
        docIdentifiers: docIds,
        parent_id: parentId,
        filePath,
        fileName,
        fileType,
        pageNumber: chunk.page,
        chunkIndex: chunk.index,
        contentHash,
        categories,
        sourceLabel,
      } satisfies RagChunkPayload,
    }));

    console.log(`[RAG ingest][${sourceLabel}] ≈ Embedding ${usableChunks.length} chunk(s) from ${fileName}…`);
    const vectors = await embedBatch(textsToEmbed);
    vectors.forEach((v, i) => { points[i].vector = v; });

    // Store full document text in the parents collection.
    // Also run a structured-data extraction pass for known doc types (payslips, etc.)
    // so the LLM gets precise key figures even when the OCR table layout is garbled.
    const fullText = usableChunks.map(c => c.text).join('\n\n');
    console.log(`[RAG ingest][${sourceLabel}] 🔢 Extracting structured data for ${fileName}…`);
    const structuredData = await extractStructuredData(fullText, docIds.doc_type, fileName);
    if (structuredData) {
      console.log(`[RAG ingest][${sourceLabel}] ✓ Structured data: ${JSON.stringify(structuredData)}`);
    }
    const parentPoint: ParentQdrantPoint = {
      id: parentId,
      vector: [0], // 1-dim dummy — parent collection is fetched by ID only
      payload: { filePath, fileName, fullText, identifierPrefix: prefix, docIdentifiers: docIds, ...(structuredData ? { structuredData: structuredData as unknown as Record<string, unknown> } : {}), categories, sourceLabel, contentHash },
    };
    await upsertParents(parentCol, [parentPoint]);

    console.log(`[RAG ingest][${sourceLabel}] ↗ Upserting ${points.length} point(s) to Qdrant…`);
    await upsertPoints(collectionName, points);

    console.log(`[RAG ingest][${sourceLabel}] ✓ Done: ${fileName} — ${points.length} vector(s) stored`);
    return { chunkIds: points.map(p => p.id), chunksCreated: points.length, pages, parentId };
  } else {
    textsToEmbed = usableChunks.map(c => c.text);
    embeddedContexts = new Array(usableChunks.length).fill(undefined);
  }

  console.log(`[RAG ingest][${sourceLabel}] ≈ Embedding ${usableChunks.length} chunk(s) from ${fileName}…`);
  const vectors = await embedBatch(textsToEmbed);

  console.log(`[RAG ingest][${sourceLabel}] ↗ Upserting ${vectors.length} point(s) to Qdrant…`);
  const points: QdrantPoint[] = usableChunks.map((chunk, i) => {
    const payload: RagChunkPayload = {
      content: chunk.text,
      ...(embeddedContexts[i] !== undefined ? { embeddedContext: embeddedContexts[i] } : {}),
      parent_id: parentId,
      filePath,
      fileName,
      fileType,
      pageNumber: chunk.page,
      chunkIndex: chunk.index,
      contentHash,
      categories,
      sourceLabel,
    };
    return { id: crypto.randomUUID(), vector: vectors[i], payload };
  });

  // Store full document text in the parents collection
  const fullText = usableChunks.map(c => c.text).join('\n\n');
  await upsertParents(parentCol, [{
    id: parentId,
    vector: [0],
    payload: { filePath, fileName, fullText, categories, sourceLabel, contentHash },
  }]);

  await upsertPoints(collectionName, points);

  console.log(`[RAG ingest][${sourceLabel}] ✓ Done: ${fileName} — ${points.length} vector(s) stored`);
  return { chunkIds: points.map(p => p.id), chunksCreated: points.length, pages, parentId };
}

// ── Directory walker ──────────────────────────────────────────────────────────

/**
 * Recursively collect all supported files under `dir`.
 * `excludePaths` are relative to `dir` (forward-slash separated);
 * any directory or file whose path starts with an excluded prefix is skipped.
 */
/** Forward-slash lowercased path for case-insensitive, separator-agnostic comparison.
 *  Also collapses non-breaking spaces (U+00A0) to regular spaces so config entries
 *  written with a normal space match NAS folder names that contain U+00A0. */
function normKey(p: string): string {
  return p.replace(/\\/g, '/').replace(/\u00a0/g, ' ').toLowerCase();
}

/** Resolve excludePaths (relative to dir) to the normalised keys used in isExcluded checks. */
function resolveExclusionKeys(dir: string, excludePaths: string[]): string[] {
  return excludePaths.map(p => {
    const abs = path.isAbsolute(p) ? p : path.join(dir, p.replace(/\//g, path.sep));
    return normKey(abs);
  });
}

function walkDirectory(dir: string, excludePaths: string[] = [], extensions: Set<string> = SUPPORTED_EXTENSIONS): string[] {
  const excluded = resolveExclusionKeys(dir, excludePaths);

  function isExcluded(fullPath: string): boolean {
    const key = normKey(fullPath);
    return excluded.some(exc => key === exc || key.startsWith(exc + '/'));
  }

  const results: string[] = [];
  function walk(current: string) {
    if (isExcluded(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (isExcluded(fullPath)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }
  walk(dir);
  return results;
}

// ── Empty summary factory ─────────────────────────────────────────────────────

function makeEmptySummary(startTime: string): IngestSummary {
  return { startTime, endTime: '', filesProcessed: 0, filesSkipped: 0, filesDeleted: 0, filesFailed: 0, totalChunks: 0, errors: [] };
}

function mergeSummaries(a: IngestSummary, b: IngestSummary): IngestSummary {
  return {
    startTime: a.startTime,
    endTime: b.endTime,
    filesProcessed: a.filesProcessed + b.filesProcessed,
    filesSkipped: a.filesSkipped + b.filesSkipped,
    filesDeleted: a.filesDeleted + b.filesDeleted,
    filesFailed: a.filesFailed + b.filesFailed,
    totalChunks: a.totalChunks + b.totalChunks,
    errors: [...a.errors, ...b.errors],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ingest a single RagSource (one configured directory).
 * Applies change detection: skips unchanged files, re-ingests changed ones,
 * removes deleted files from Qdrant.
 *
 * @param onFileResult  called after every file with its result
 * @param onJobProgress called after every file with (processed, total)
 */
export async function ingestSource(
  source: RagSource,
  collectionName: string,
  onFileResult?: (result: IngestResult) => void,
  onJobProgress?: (processed: number, total: number) => void,
): Promise<IngestSummary> {
  const startTime = new Date().toISOString();
  const manifest = readManifest();
  const parentsCol = getParentsCollectionName(collectionName);
  const results: IngestResult[] = [];

  if (!fs.existsSync(source.path)) {
    throw new Error(`Source path does not exist: ${source.path}`);
  }

  // source.path can point to a single file (e.g. animes_MAL.json) or a directory
  const isFile = fs.statSync(source.path).isFile();
  const rawDiskPaths = isFile
    ? [source.path]
    : walkDirectory(source.path, source.excludePaths ?? [], getSourceExtensions(source));
  // Forward-slash key set — matches the manifest key format (normalizePath in manifest.ts)
  // Used for "is this file still on disk?" checks against manifest keys.
  const diskFileKeys = new Set(rawDiskPaths.map(p => p.replace(/\\/g, '/')));
  const total = rawDiskPaths.length;
  let processed = 0;

  console.log(`[RAG ingest][${source.label}] Starting — ${total} file(s) found in source`);

  // Deleted files — only clean up entries that belong to this source.
  // For directory sources: manifest key must start with the source dir prefix (forward-slash, trailing slash added).
  // For single-file sources: manifest key must exactly equal the normalised source path.
  const sourceNormPath = source.path.replace(/\\/g, '/');
  const isSourceFile = isFile;
  const collectionPrefix = `${collectionName}::`;
  function belongsToThisSource(manifestKey: string): boolean {
    // Strip collection scope prefix if present (new format), then check path prefix
    const filePart = manifestKey.startsWith(collectionPrefix)
      ? manifestKey.slice(collectionPrefix.length)
      : manifestKey;
    if (isSourceFile) return filePart === sourceNormPath;
    return filePart.startsWith(sourceNormPath.replace(/\/$/, '') + '/');
  }
  for (const [manifestKey, entry] of Object.entries(manifest.files)) {
    // Strip collection scope prefix to get the plain file path for disk-presence check
    const filePart = manifestKey.startsWith(collectionPrefix)
      ? manifestKey.slice(collectionPrefix.length)
      : manifestKey;
    if (belongsToThisSource(manifestKey) && !diskFileKeys.has(filePart)) {
      try {
        await deletePoints(collectionName, entry.chunkIds);
        if (entry.parentId) await deleteParents(parentsCol, [entry.parentId]);
        removeManifestEntry(manifest, filePart, collectionName);
        const r: IngestResult = { filePath: filePart, status: 'deleted' };
        results.push(r);
        onFileResult?.(r);
      } catch (err: any) {
        const r: IngestResult = { filePath: filePart, status: 'failed', error: err.message };
        results.push(r);
        onFileResult?.(r);
      }
      processed++;
      onJobProgress?.(processed, total);
    }
  }

  // Process each file on disk
  for (const filePath of rawDiskPaths) {
    try {
      const contentHash = computeFileHash(filePath);
      const categories = resolveCategories(filePath, source);
      const existing = getManifestEntry(manifest, filePath, collectionName);

      // Skip if hash unchanged AND categories unchanged
      const categoriesChanged = existing
        ? JSON.stringify(existing.categories ?? []) !== JSON.stringify(categories)
        : false;

      if (existing && existing.contentHash === contentHash && !categoriesChanged) {
        const r: IngestResult = { filePath, status: 'skipped' };
        results.push(r);
        onFileResult?.(r);
        processed++;
        onJobProgress?.(processed, total);
        continue;
      }

      // Delete old chunks and parent doc before re-ingesting
      if (existing && existing.chunkIds.length > 0) {
        console.log(`[RAG ingest][${source.label}] ♻ Re-ingesting changed file: ${path.basename(filePath)}`);
        await deletePoints(collectionName, existing.chunkIds);
        if (existing.parentId) await deleteParents(parentsCol, [existing.parentId]);
      }

      const { chunkIds, chunksCreated, pages, parentId } = await ingestFile(
        filePath, contentHash, categories, source.label, collectionName, parentsCol, source.typeOfSource,
      );

      const entry: ManifestEntry = {
        contentHash,
        lastIngested: new Date().toISOString(),
        chunkIds,
        parentId,
        filePath,
        fileType: getFileType(filePath),
        pages,
        categories,
      };
      setManifestEntry(manifest, filePath, entry, collectionName);

      const r: IngestResult = { filePath, status: 'ingested', chunksCreated };
      results.push(r);
      onFileResult?.(r);
    } catch (err: any) {
      const r: IngestResult = { filePath, status: 'failed', error: err.message };
      results.push(r);
      onFileResult?.(r);
    }
    processed++;
    onJobProgress?.(processed, total);
  }

  writeManifest(manifest);
  const endTime = new Date().toISOString();

  const summary = {
    startTime,
    endTime,
    filesProcessed: results.filter(r => r.status === 'ingested').length,
    filesSkipped: results.filter(r => r.status === 'skipped').length,
    filesDeleted: results.filter(r => r.status === 'deleted').length,
    filesFailed: results.filter(r => r.status === 'failed').length,
    totalChunks: results.reduce((sum, r) => sum + (r.chunksCreated ?? 0), 0),
    errors: results
      .filter(r => r.status === 'failed')
      .map(r => ({ file: r.filePath, error: r.error ?? 'unknown' })),
  };

  const durationSec = ((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000).toFixed(1);
  console.log(
    `[RAG ingest][${source.label}] Finished in ${durationSec}s —`,
    `processed: ${summary.filesProcessed},`,
    `skipped: ${summary.filesSkipped},`,
    `deleted: ${summary.filesDeleted},`,
    `failed: ${summary.filesFailed},`,
    `chunks: ${summary.totalChunks}`,
  );
  if (summary.errors.length > 0) {
    for (const e of summary.errors) {
      console.error(`[RAG ingest][${source.label}] ✗ ${path.basename(e.file)}: ${e.error}`);
    }
  }

  return summary;
}

/**
 * Ingest ALL configured sources sequentially.
 * This is the main entry point for the nightly job.
 *
 * @param onFileResult  called after every file
 * @param onJobProgress called after every file with cumulative (processed, total) across all sources
 */
export async function ingestAll(
  onFileResult?: (sourceLabel: string, result: IngestResult) => void,
  onJobProgress?: (processed: number, total: number) => void,
): Promise<IngestSummary> {
  const config = readRagConfig();
  const startTime = new Date().toISOString();
  let combined = makeEmptySummary(startTime);

  // Pre-walk every source to get a reliable grand total before processing starts
  const sourceTotals = config.sources.map(s => {
    if (!fs.existsSync(s.path)) return 0;
    const stat = fs.statSync(s.path);
    return stat.isFile() ? 1 : walkDirectory(s.path, s.excludePaths ?? [], getSourceExtensions(s)).length;
  });
  const grand = sourceTotals.reduce((a, b) => a + b, 0);
  let sourceOffset = 0;

  console.log(`[RAG ingest] Starting full ingestion — ${config.sources.length} source(s), ~${grand} total file(s)`);

  for (let i = 0; i < config.sources.length; i++) {
    const source = config.sources[i];
    const sourceCollection = source.collection ?? config.collection;
    const summary = await ingestSource(
      source,
      sourceCollection,
      result => onFileResult?.(source.label, result),
      // convert per-source progress to a global count
      (processed, _total) => onJobProgress?.(sourceOffset + processed, grand),
    );
    sourceOffset += sourceTotals[i];
    combined = mergeSummaries(combined, summary);
  }

  combined.endTime = new Date().toISOString();
  return combined;
}

/**
 * Dry-run: returns the list of files that WOULD be walked for a given source,
 * respecting all exclusion rules. No ingestion happens.
 * Used by the /api/rag/preview endpoint to verify config before a full re-index.
 */
export function previewSourceFiles(sourceIndex: number): {
  source: { label: string; path: string; collection: string };
  files: { filePath: string; categories: string[] }[];
  excluded: string[];
  resolvedExclusions: string[];
  total: number;
} {
  const config = readRagConfig();
  const source = config.sources[sourceIndex];
  if (!source) throw new Error(`Source index ${sourceIndex} not found`);

  if (!fs.existsSync(source.path)) {
    throw new Error(`Source path does not exist: ${source.path}`);
  }

  const isFile = fs.statSync(source.path).isFile();
  const files = isFile
    ? [source.path]
    : walkDirectory(source.path, source.excludePaths ?? [], getSourceExtensions(source));

  return {
    source: {
      label: source.label,
      path: source.path,
      collection: source.collection ?? config.collection,
    },
    files: files.map(f => ({
      filePath: f,
      categories: resolveCategories(f, source),
    })),
    excluded: source.excludePaths ?? [],
    resolvedExclusions: resolveExclusionKeys(source.path, source.excludePaths ?? []),
    total: files.length,
  };
}

/** Returns the current manifest state for status reporting */
export function getIngestStatus() {
  const config = readRagConfig();
  const manifest = readManifest();
  return {
    lastRun: manifest.lastRun,
    totalIndexed: Object.keys(manifest.files).length,
    collection: config.collection,
    sources: config.sources.map((s, i) => {
      // Collect all unique categories defined for this source
      const allCategories = Array.from(new Set([
        ...s.defaultCategories,
        ...s.categoryMappings.flatMap(m => m.categories),
      ]));
      return {
        index: i,
        label: s.label,
        path: s.path,
        collection: s.collection ?? config.collection,
        categories: allCategories,
      };
    }),
  };
}
