/**
 * POST /api/rag/ingest/preview-file
 *
 * Dry-run the ingestion pipeline on a single file.  Returns every intermediate
 * result (extracted text, chunks, doc identifiers, structured data) WITHOUT
 * writing anything to Qdrant or the manifest.
 *
 * Use this to iterate on extraction quality for individual documents.
 *
 * Body:
 *   filePath:      string   — absolute path to the file to process
 *   categories?:   string[] — override categories (default: ["uncategorized"])
 *   typeOfSource?: string   — 'generic' | 'animeData' (default: 'generic')
 *   skipLlm?:      boolean  — skip all LLM calls (identifiers + structured data)
 *   skipIdentifiers?: boolean — skip only doc-identifier extraction
 *   skipStructuredData?: boolean — skip only structured-data extraction
 *
 * Response: full extraction breakdown (see PreviewFileResponse below)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { extractFile, getFileType } from '@/lib/rag/ingestor';
import { chunkText } from '@/lib/rag/chunker';
import { extractDocIdentifiers, buildIdentifierPrefix, type DocIdentifiers } from '@/lib/rag/docIdentifierExtractor';
import { extractStructuredData, formatStructuredDataForPrompt, type StructuredData } from '@/lib/rag/structuredDataExtractor';

interface PreviewFileRequest {
  filePath: string;
  categories?: string[];
  typeOfSource?: string;
  skipLlm?: boolean;
  skipIdentifiers?: boolean;
  skipStructuredData?: boolean;
}

interface ChunkPreview {
  index: number;
  page?: number;
  charCount: number;
  wordCharCount: number;
  isJunk: boolean;
  text: string;
}

interface PreviewFileResponse {
  fileName: string;
  filePath: string;
  fileType: 'pdf' | 'image' | 'text';
  categories: string[];
  typeOfSource: string;

  // Extraction
  extraction: {
    segmentCount: number;
    skipChunking: boolean;
    segments: { page?: number; charCount: number; textPreview: string }[];
    fullTextCharCount: number;
  };

  // Chunking
  chunking: {
    totalChunks: number;
    usableChunks: number;
    junkChunks: number;
    chunks: ChunkPreview[];
  };

  // Doc identifiers (LLM call #1)
  identifiers?: {
    docIdentifiers: DocIdentifiers;
    prefix: string;
    skipped?: boolean;
  };

  // Structured data (LLM call #2)
  structuredData?: {
    data: StructuredData | null;
    formatted: string;
    skipped?: boolean;
  };

  // What the prompt builder would see
  promptPreview: {
    headerBlock: string;
    fullTextCharCount: number;
    effectiveTextCharCount: number;
    effectiveTextPreview: string;
  };

  timings: {
    extraction_ms: number;
    identifiers_ms: number | null;
    structuredData_ms: number | null;
    total_ms: number;
  };
}

const MIN_WORD_CHARS = 80;

function countWordChars(text: string): number {
  return (text.match(/[a-zA-ZÀ-ÿ]/g) ?? []).length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const body = req.body as PreviewFileRequest;
  if (!body.filePath || typeof body.filePath !== 'string') {
    return res.status(400).json({ error: '`filePath` is required (absolute path to a file)' });
  }

  const filePath = body.filePath;
  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ error: `File not found: ${filePath}` });
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return res.status(400).json({ error: `Path is not a file: ${filePath}` });
  }

  const categories = body.categories ?? ['uncategorized'];
  const typeOfSource = body.typeOfSource ?? 'generic';
  const skipIdentifiers = body.skipLlm || body.skipIdentifiers || false;
  const skipStructuredData = body.skipLlm || body.skipStructuredData || false;

  const totalStart = Date.now();
  const fileName = path.basename(filePath);
  const fileType = getFileType(filePath);

  try {
    // ── Step 1: Text extraction ─────────────────────────────────────────────
    const extractionStart = Date.now();
    const extraction = await extractFile(filePath, fileType, typeOfSource);
    const extractionMs = Date.now() - extractionStart;

    // ── Step 2: Chunking ────────────────────────────────────────────────────
    const allChunks: { text: string; page?: number; index: number }[] = [];
    let globalIndex = 0;
    for (const segment of extraction.segments) {
      const texts = extraction.skipChunking ? [segment.text] : chunkText(segment.text);
      for (const text of texts) {
        allChunks.push({ text, page: segment.page, index: globalIndex++ });
      }
    }

    const chunkPreviews: ChunkPreview[] = allChunks.map(c => {
      const wordCharCount = countWordChars(c.text);
      return {
        index: c.index,
        page: c.page,
        charCount: c.text.length,
        wordCharCount,
        isJunk: wordCharCount < MIN_WORD_CHARS,
        text: c.text,
      };
    });
    const usableChunks = chunkPreviews.filter(c => !c.isJunk);
    const junkChunks = chunkPreviews.filter(c => c.isJunk);

    // ── Step 3: Doc identifiers (optional LLM call) ─────────────────────────
    let identifiersResult: PreviewFileResponse['identifiers'];
    let identifiersMs: number | null = null;

    if (skipIdentifiers || usableChunks.length === 0 || fileType === 'image' || extraction.skipChunking) {
      identifiersResult = {
        docIdentifiers: { doc_type: 'other', employee_name: null, company_name: null, doc_date: null, year: null, month: null },
        prefix: '[Document]',
        skipped: true,
      };
    } else {
      const idStart = Date.now();
      const docIds = await extractDocIdentifiers(usableChunks[0].text, fileName, categories);
      identifiersMs = Date.now() - idStart;
      identifiersResult = {
        docIdentifiers: docIds,
        prefix: buildIdentifierPrefix(docIds),
      };
    }

    // ── Step 4: Structured data extraction (optional LLM call) ──────────────
    let structuredDataResult: PreviewFileResponse['structuredData'];
    let structuredDataMs: number | null = null;
    const fullText = usableChunks.map(c => c.text).join('\n\n');
    const docType = identifiersResult?.docIdentifiers.doc_type ?? 'other';

    if (skipStructuredData) {
      structuredDataResult = { data: null, formatted: '', skipped: true };
    } else {
      const sdStart = Date.now();
      const sd = await extractStructuredData(fullText, docType, fileName);
      structuredDataMs = Date.now() - sdStart;
      structuredDataResult = {
        data: sd ?? null,
        formatted: formatStructuredDataForPrompt(sd),
      };
    }

    // ── Step 5: Prompt preview ──────────────────────────────────────────────
    const structuredBlock = structuredDataResult?.formatted ?? '';
    const prefix = identifiersResult?.prefix ?? '';
    const headerLines = [
      `--- Document: ${fileName} ---`,
      ...(prefix ? [prefix] : []),
      ...(structuredBlock ? [structuredBlock] : []),
    ];
    const headerBlock = headerLines.join('\n');

    // Replicate the 1.1 optimization: if structured data exists, truncate raw text
    const RAW_TEXT_EXCERPT_CHARS = 200;
    const hasStructuredData = structuredBlock.length > 0;
    const effectiveText = hasStructuredData
      ? (fullText.length > RAW_TEXT_EXCERPT_CHARS
          ? fullText.slice(0, RAW_TEXT_EXCERPT_CHARS) + '\n[...raw text omitted — key figures above are authoritative]'
          : fullText)
      : fullText;

    const totalMs = Date.now() - totalStart;

    const response: PreviewFileResponse = {
      fileName,
      filePath,
      fileType,
      categories,
      typeOfSource,
      extraction: {
        segmentCount: extraction.segments.length,
        skipChunking: !!extraction.skipChunking,
        segments: extraction.segments.map(s => ({
          page: s.page,
          charCount: s.text.length,
          textPreview: s.text.slice(0, 500) + (s.text.length > 500 ? '…' : ''),
        })),
        fullTextCharCount: extraction.segments.reduce((sum, s) => sum + s.text.length, 0),
      },
      chunking: {
        totalChunks: chunkPreviews.length,
        usableChunks: usableChunks.length,
        junkChunks: junkChunks.length,
        chunks: chunkPreviews,
      },
      identifiers: identifiersResult,
      structuredData: structuredDataResult,
      promptPreview: {
        headerBlock,
        fullTextCharCount: fullText.length,
        effectiveTextCharCount: effectiveText.length,
        effectiveTextPreview: (headerBlock + '\n' + effectiveText).slice(0, 2000)
          + (headerBlock.length + effectiveText.length > 2000 ? '\n…' : ''),
      },
      timings: {
        extraction_ms: extractionMs,
        identifiers_ms: identifiersMs,
        structuredData_ms: structuredDataMs,
        total_ms: totalMs,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error(`[preview-file] Error processing ${filePath}:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
