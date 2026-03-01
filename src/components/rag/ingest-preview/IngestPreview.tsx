import { useState } from 'react';
import styles from './IngestPreview.module.css';
import { Button } from '@/components/shared';
import type { DocIdentifiers } from '@/models/rag';

// ── Response types (mirrors API) ──────────────────────────────────────────────

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
  extraction: {
    segmentCount: number;
    skipChunking: boolean;
    segments: { page?: number; charCount: number; textPreview: string }[];
    fullTextCharCount: number;
  };
  chunking: {
    totalChunks: number;
    usableChunks: number;
    junkChunks: number;
    chunks: ChunkPreview[];
  };
  identifiers?: {
    docIdentifiers: DocIdentifiers;
    prefix: string;
    skipped?: boolean;
  };
  structuredData?: {
    data: Record<string, unknown> | null;
    formatted: string;
    skipped?: boolean;
  };
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

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_OF_SOURCE_OPTIONS = [
  { value: 'generic', label: 'Generic' },
  { value: 'animeData', label: 'Anime Data' },
];

const CATEGORY_OPTIONS = [
  'payslip',
  'employment_contract',
  'work',
  'home',
  'bill',
  'identity',
  'document',
  'anime',
];

// ── Collapsible section helper ────────────────────────────────────────────────

function ResultSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setOpen(v => !v)}>
        <h4 className={styles.sectionTitle}>
          <span className={styles.sectionChevron}>{open ? '▾' : '▸'}</span>
          {title}
        </h4>
        {badge && <span className={styles.sectionBadge}>{badge}</span>}
      </div>
      {open && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IngestPreview() {
  // Form state
  const [filePath, setFilePath] = useState('');
  const [categories, setCategories] = useState<string[]>(['payslip']);
  const [typeOfSource, setTypeOfSource] = useState('generic');
  const [skipLlm, setSkipLlm] = useState(false);
  const [skipIdentifiers, setSkipIdentifiers] = useState(false);
  const [skipStructuredData, setSkipStructuredData] = useState(false);

  // Result state
  const [result, setResult] = useState<PreviewFileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryToggle = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );
  };

  const handlePreview = async () => {
    if (!filePath.trim()) {
      setError('File path is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/rag/ingest/preview-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: filePath.trim(),
          categories: categories.length > 0 ? categories : undefined,
          typeOfSource,
          skipLlm,
          skipIdentifiers: skipLlm ? undefined : skipIdentifiers,
          skipStructuredData: skipLlm ? undefined : skipStructuredData,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      void handlePreview();
    }
  };

  const fmtMs = (ms: number | null) => (ms != null ? `${ms.toLocaleString()}ms` : '—');

  return (
    <div className={styles.wrapper}>
      {/* ── Left pane: form ─────────────────────────────────────────────────── */}
      <div className={styles.formPane} onKeyDown={handleKeyDown}>
        <h3 className={styles.formTitle}>Ingestion Preview</h3>

        {/* File path */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>File path</label>
          <input
            type="text"
            className={styles.fieldInput}
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
            placeholder="\\\\syno\\root2\\Cloud\\..."
          />
        </div>

        {/* Type of source */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Type of source</label>
          <select
            className={styles.fieldSelect}
            value={typeOfSource}
            onChange={e => setTypeOfSource(e.target.value)}
          >
            {TYPE_OF_SOURCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Categories (multi-select checkboxes) */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Categories</label>
          <div className={styles.skipGroup}>
            {CATEGORY_OPTIONS.map(cat => (
              <label key={cat} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={categories.includes(cat)}
                  onChange={() => handleCategoryToggle(cat)}
                />
                <span className={styles.checkboxLabel}>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Skip options */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Skip options</label>
          <div className={styles.skipGroup}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={skipLlm}
                onChange={e => {
                  setSkipLlm(e.target.checked);
                  if (e.target.checked) {
                    setSkipIdentifiers(false);
                    setSkipStructuredData(false);
                  }
                }}
              />
              <span className={styles.checkboxLabel}>Skip all LLM calls</span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={skipIdentifiers}
                disabled={skipLlm}
                onChange={e => setSkipIdentifiers(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Skip identifiers only</span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={skipStructuredData}
                disabled={skipLlm}
                onChange={e => setSkipStructuredData(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Skip structured data only</span>
            </label>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.previewBtn}>
          <Button onClick={handlePreview} disabled={loading || !filePath.trim()}>
            {loading ? 'Processing…' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* ── Right pane: results ─────────────────────────────────────────────── */}
      <div className={styles.resultPane}>
        {!result && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔬</div>
            <p className={styles.emptyTitle}>No preview yet</p>
            <p className={styles.emptyHint}>Enter a file path and click Preview · Ctrl+Enter to submit</p>
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Processing file…</span>
          </div>
        )}

        {result && <PreviewResults result={result} fmtMs={fmtMs} />}
      </div>
    </div>
  );
}

// ── Results rendering ─────────────────────────────────────────────────────────

function PreviewResults({
  result,
  fmtMs,
}: {
  result: PreviewFileResponse;
  fmtMs: (ms: number | null) => string;
}) {
  return (
    <>
      {/* Header + timings */}
      <div className={styles.resultHeader}>
        <h3 className={styles.resultFileName}>{result.fileName}</h3>
        <div className={styles.resultMeta}>
          <span className={styles.badge}>{result.fileType}</span>
          <span className={styles.badge}>{result.typeOfSource}</span>
        </div>
      </div>

      <div className={styles.timings}>
        <div className={styles.timingItem}>
          <span className={styles.timingLabel}>Total:</span>
          <span className={styles.timingValue}>{fmtMs(result.timings.total_ms)}</span>
        </div>
        <div className={styles.timingItem}>
          <span className={styles.timingLabel}>Extraction:</span>
          <span className={styles.timingValue}>{fmtMs(result.timings.extraction_ms)}</span>
        </div>
        <div className={styles.timingItem}>
          <span className={styles.timingLabel}>Identifiers:</span>
          <span className={styles.timingValue}>{fmtMs(result.timings.identifiers_ms)}</span>
        </div>
        <div className={styles.timingItem}>
          <span className={styles.timingLabel}>Structured:</span>
          <span className={styles.timingValue}>{fmtMs(result.timings.structuredData_ms)}</span>
        </div>
      </div>

      {/* Extraction */}
      <ResultSection
        title="Extraction"
        badge={`${result.extraction.segmentCount} segment(s) · ${result.extraction.fullTextCharCount.toLocaleString()} chars`}
        defaultOpen
      >
        <div className={styles.kvGrid}>
          <span className={styles.kvKey}>Segments:</span>
          <span className={styles.kvValue}>{result.extraction.segmentCount}</span>
          <span className={styles.kvKey}>Total chars:</span>
          <span className={styles.kvValue}>{result.extraction.fullTextCharCount.toLocaleString()}</span>
          <span className={styles.kvKey}>Skip chunking:</span>
          <span className={styles.kvValue}>{result.extraction.skipChunking ? 'Yes' : 'No'}</span>
        </div>
        {result.extraction.segments.map((seg, i) => (
          <div key={i} style={{ marginTop: '0.5rem' }}>
            <div className={styles.kvGrid}>
              <span className={styles.kvKey}>Segment {i}:</span>
              <span className={styles.kvValue}>{seg.charCount.toLocaleString()} chars{seg.page ? ` (page ${seg.page})` : ''}</span>
            </div>
            <div className={styles.codeBlock}>{seg.textPreview}</div>
          </div>
        ))}
      </ResultSection>

      {/* Chunking */}
      <ResultSection
        title="Chunks"
        badge={`${result.chunking.usableChunks} usable · ${result.chunking.junkChunks} junk · ${result.chunking.totalChunks} total`}
      >
        <ChunkList chunks={result.chunking.chunks} />
      </ResultSection>

      {/* Doc Identifiers */}
      <ResultSection
        title="Doc Identifiers"
        badge={result.identifiers?.skipped ? 'skipped' : result.identifiers?.docIdentifiers.doc_type ?? ''}
        defaultOpen
      >
        {result.identifiers?.skipped ? (
          <span className={styles.kvValue} style={{ fontStyle: 'italic' }}>Skipped (LLM call not made)</span>
        ) : result.identifiers ? (
          <>
            <div className={styles.kvGrid}>
              <span className={styles.kvKey}>Prefix:</span>
              <span className={styles.kvValue}>{result.identifiers.prefix}</span>
              <span className={styles.kvKey}>doc_type:</span>
              <span className={styles.kvValue}>{result.identifiers.docIdentifiers.doc_type}</span>
              <span className={styles.kvKey}>employee_name:</span>
              <span className={styles.kvValue}>{result.identifiers.docIdentifiers.employee_name ?? '—'}</span>
              <span className={styles.kvKey}>company_name:</span>
              <span className={styles.kvValue}>{result.identifiers.docIdentifiers.company_name ?? '—'}</span>
              <span className={styles.kvKey}>doc_date:</span>
              <span className={styles.kvValue}>{result.identifiers.docIdentifiers.doc_date ?? '—'}</span>
              <span className={styles.kvKey}>year:</span>
              <span className={styles.kvValue}>{result.identifiers.docIdentifiers.year ?? '—'}</span>
              <span className={styles.kvKey}>month:</span>
              <span className={styles.kvValue}>{result.identifiers.docIdentifiers.month ?? '—'}</span>
            </div>
          </>
        ) : null}
      </ResultSection>

      {/* Structured Data */}
      <ResultSection
        title="Structured Data"
        badge={result.structuredData?.skipped ? 'skipped' : result.structuredData?.data ? 'extracted' : 'none'}
        defaultOpen
      >
        {result.structuredData?.skipped ? (
          <span className={styles.kvValue} style={{ fontStyle: 'italic' }}>Skipped (LLM call not made)</span>
        ) : result.structuredData?.data ? (
          <>
            <div className={styles.codeBlock}>{JSON.stringify(result.structuredData.data, null, 2)}</div>
            {result.structuredData.formatted && (
              <div style={{ marginTop: '0.5rem' }}>
                <span className={styles.kvKey}>Formatted for prompt:</span>
                <div className={styles.codeBlock}>{result.structuredData.formatted}</div>
              </div>
            )}
          </>
        ) : (
          <span className={styles.kvValue} style={{ fontStyle: 'italic' }}>No structured data extracted (unsupported doc type or extraction returned empty)</span>
        )}
      </ResultSection>

      {/* Prompt Preview */}
      <ResultSection
        title="Prompt Preview"
        badge={`${result.promptPreview.effectiveTextCharCount.toLocaleString()} effective / ${result.promptPreview.fullTextCharCount.toLocaleString()} full chars`}
        defaultOpen
      >
        <div className={styles.kvGrid}>
          <span className={styles.kvKey}>Full text:</span>
          <span className={styles.kvValue}>{result.promptPreview.fullTextCharCount.toLocaleString()} chars</span>
          <span className={styles.kvKey}>Effective text:</span>
          <span className={styles.kvValue}>{result.promptPreview.effectiveTextCharCount.toLocaleString()} chars</span>
          <span className={styles.kvKey}>Reduction:</span>
          <span className={styles.kvValue}>
            {result.promptPreview.fullTextCharCount > 0
              ? `${Math.round((1 - result.promptPreview.effectiveTextCharCount / result.promptPreview.fullTextCharCount) * 100)}%`
              : '—'}
          </span>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <span className={styles.kvKey}>What the LLM sees:</span>
          <div className={styles.codeBlock}>{result.promptPreview.effectiveTextPreview}</div>
        </div>
      </ResultSection>
    </>
  );
}

// ── Chunk list subcomponent ───────────────────────────────────────────────────

function ChunkList({ chunks }: { chunks: ChunkPreview[] }) {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  const toggleChunk = (idx: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className={styles.chunkList}>
      {chunks.map(chunk => (
        <div key={chunk.index} className={styles.chunkItem}>
          <div className={styles.chunkHeader} onClick={() => toggleChunk(chunk.index)}>
            <span className={styles.sectionChevron}>{expandedChunks.has(chunk.index) ? '▾' : '▸'}</span>
            <span className={styles.chunkIndex}>#{chunk.index}</span>
            <span className={styles.chunkStats}>
              {chunk.charCount} chars · {chunk.wordCharCount} word chars
              {chunk.page != null ? ` · p.${chunk.page}` : ''}
            </span>
            {chunk.isJunk && <span className={styles.chunkJunk}>JUNK</span>}
          </div>
          {expandedChunks.has(chunk.index) && (
            <div className={styles.chunkText}>{chunk.text}</div>
          )}
        </div>
      ))}
    </div>
  );
}
