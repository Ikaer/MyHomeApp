/**
 * RAG subapp models and interfaces
 */

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * Maps a sub-path inside a source to one or more categories.
 * Matching: longest prefix of the file's path relative to source.path wins.
 * e.g. subPath: "Boulot/Chapsvision" matches files under that folder.
 */
export interface CategoryMapping {
  subPath: string;          // relative to source.path, use forward slashes
  categories: string[];
}

export interface RagSource {
  path: string;             // absolute path to a directory OR a single file
  label: string;            // human-readable name shown in the UI
  typeOfSource?: string;    // 'generic' (default) | 'animeData' | … — controls extraction strategy
  collection?: string;      // overrides config.collection for this source (separate Qdrant collection)
  defaultCategories: string[]; // fallback when no mapping matches
  categoryMappings: CategoryMapping[];
  excludePaths?: string[];  // sub-paths (relative to source.path) to skip during walk (directories only)
}

export interface RagConfig {
  collection: string;
  schedule: string;         // cron expression for nightly ingestion
  sources: RagSource[];
}

// ── Manifest ─────────────────────────────────────────────────────────────────

export interface ManifestEntry {
  contentHash: string;
  lastIngested: string;
  chunkIds: string[];
  filePath: string;
  fileType: 'pdf' | 'image' | 'text';
  pages?: number;
  categories: string[];     // stored so diff is detectable on re-ingest
  parentId?: string;        // UUID pointing to the full document in {collection}_parents
}

export interface IngestManifest {
  version: number;
  lastRun: string | null;
  files: Record<string, ManifestEntry>; // key: normalized absolute file path
}

// ── Qdrant payload ───────────────────────────────────────────────────────────

/**
 * Structured global identifiers extracted from a document at ingest time.
 * Prepended to every chunk before embedding and stored in the payload for
 * hybrid filtering at query time.
 */
export interface DocIdentifiers {
  doc_type: 'payslip' | 'invoice' | 'contract' | 'tax_notice' | 'bank_statement' | 'insurance' | 'other';
  employee_name: string | null;
  company_name: string | null;
  doc_date: string | null;   // ISO "YYYY-MM-DD" or partial "YYYY-MM"
  year: number | null;
  month: number | null;      // 1-12
}

export interface RagChunkPayload {
  content: string;             // raw extracted text — used to build the chunk embedding
  embeddedContext?: string;    // identifier prefix prepended before embedding
  docIdentifiers?: DocIdentifiers; // structured metadata for hybrid filtering
  parent_id?: string;          // UUID pointing to the full document in {collection}_parents
  filePath: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'text';
  pageNumber?: number;
  chunkIndex: number;
  contentHash: string;
  categories: string[];        // array — supports multi-category filtering
  sourceLabel: string;         // which RagSource this came from
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: RagChunkPayload;
}

/**
 * Full document stored in the {collection}_parents Qdrant collection.
 * Chunks are pointers only; this is what the LLM actually reads.
 */
export interface ParentDocPayload {
  filePath: string;
  fileName: string;
  fullText: string;           // complete extracted text (Docling MD or pdf-parse)
  identifierPrefix?: string;  // e.g. "[Bulletin de paie | Xavier Lefebvre | COMPARIO | 2021-02]"
  docIdentifiers?: DocIdentifiers;
  structuredData?: Record<string, unknown>; // LLM-extracted key figures (amounts, dates)
  categories: string[];
  sourceLabel: string;
  contentHash: string;
}

export interface ParentQdrantPoint {
  id: string;       // = parent_id stored in each chunk
  vector: number[]; // [0] — single-dim dummy; parent collection is never vector-searched
  payload: ParentDocPayload;
}

/**
 * A matched document assembled for the LLM prompt.
 * Produced at query time by fetching from the parents collection.
 */
export interface ParentDoc {
  fileName: string;
  filePath: string;
  fullText: string;
  identifierPrefix?: string;
  docIdentifiers?: DocIdentifiers;
  structuredData?: Record<string, unknown>; // LLM-extracted key figures (amounts, dates)
  categories: string[];
  sourceLabel: string;
  score: number;             // best chunk score that pointed to this document
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export interface IngestResult {
  filePath: string;
  status: 'ingested' | 'skipped' | 'failed' | 'deleted';
  chunksCreated?: number;
  error?: string;
}

export interface IngestSummary {
  startTime: string;
  endTime: string;
  filesProcessed: number;
  filesSkipped: number;
  filesDeleted: number;
  filesFailed: number;
  totalChunks: number;
  errors: { file: string; error: string }[];
}

export type IngestJobStatus = 'running' | 'completed' | 'failed' | 'stopped';

export interface IngestJobProgress {
  processed: number;  // files completed (ingested + skipped + failed)
  total: number;      // total files found in source(s)
}

export interface IngestJob {
  id: string;
  status: IngestJobStatus;
  stopReason?: string;     // set when status === 'stopped'
  progress?: IngestJobProgress;
  target: string;          // 'all sources' | source label
  sourceIndex?: number;
  startTime: string;
  endTime?: string;
  summary?: IngestSummary;
  error?: string;
}

// ── Query ─────────────────────────────────────────────────────────────────────

export interface QueryRequest {
  question: string;
  topK?: number;
  collection?: string;      // target Qdrant collection; defaults to config.collection
  categories?: string[];    // optional — filter results to these categories
}

export interface SourceReference {
  fileName: string;
  filePath: string;
  pageNumber?: number;
  excerpt: string;             // raw chunk text (used internally; may be garbled for PDFs)
  embeddedContext?: string;   // the human-readable description that was embedded (show this in UI)
  score: number;
  categories: string[];
  sourceLabel: string;
  // Debug / export info (populated server-side, not displayed in UI)
  charsInContext?: number;    // chars of this doc actually sent to the LLM
  charsTruncated?: number;    // chars that were cut off due to budget constraints
  fromParents?: boolean;      // true = fetched from _parents collection; false = legacy chunk concat
}

export interface DocStat {
  fileName: string;
  charsUsed: number;
  charsTruncated: number;
  fromParents: boolean;
}

export interface RagDebugInfo {
  model: string;
  hydeDoc: string;
  queryFilter: { doc_type: string | null; year: number | null; month: number | null } | null;
  totalContextChars: number;
  contextBudgetChars: number;
  perDocBudgetChars: number;
  docsRetrieved: number;
  docsFromParents: number;
  docsFromLegacy: number;
  docStats: DocStat[];
}

export interface QueryResponse {
  answer: string;
  sources: SourceReference[];
  debugInfo?: RagDebugInfo;
}
