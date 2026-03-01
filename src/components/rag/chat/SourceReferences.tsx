import { useState } from 'react';
import styles from './SourceReferences.module.css';
import type { SourceReference } from '@/models/rag';

interface SourceReferencesProps {
  sources: SourceReference[];
}

export default function SourceReferences({ sources }: SourceReferencesProps) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className={styles.container}>
      <button
        className={styles.toggle}
        onClick={() => setExpanded(v => !v)}
        type="button"
      >
        <span className={styles.chevron}>{expanded ? '▾' : '▸'}</span>
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>

      {expanded && (
        <div className={styles.list}>
          {sources.map((src, i) => (
            <div key={i} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.fileName}>{src.fileName}</span>
                {src.pageNumber !== undefined && (
                  <span className={styles.page}>p.{src.pageNumber}</span>
                )}
                <span className={styles.score}>{(src.score * 100).toFixed(0)}%</span>
                <span className={styles.sourceLabel}>{src.sourceLabel}</span>
              </div>
              {/* Prefer the human-readable LLM-generated context; fall back to raw excerpt */}
              <p className={styles.excerpt}>
                {src.embeddedContext ?? src.excerpt}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
