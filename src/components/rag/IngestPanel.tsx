import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './IngestPanel.module.css';
import { Button } from '@/components/shared';
import type { IngestJob } from '@/models/rag';

interface SourceInfo {
  index: number;
  label: string;
  collection: string;
  path: string;
}

interface IngestStatusData {
  lastRun: string | null;
  totalIndexed: number;
  sources: SourceInfo[];
  recentJobs: IngestJob[];
}

export default function IngestPanel() {
  const [statusData, setStatusData] = useState<IngestStatusData | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<IngestJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/rag/ingest');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatusData(await res.json());
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/rag/ingest/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job: IngestJob = await res.json();
      setActiveJob(job);
      if (job.status === 'running') {
        pollTimer.current = setTimeout(() => pollJob(jobId), 2000);
      } else {
        setActiveJobId(null);
        fetchStatus();
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [fetchStatus]);

  // Initial load
  useEffect(() => {
    fetchStatus();
    return () => { if (pollTimer.current) clearTimeout(pollTimer.current); };
  }, [fetchStatus]);

  // Start polling whenever a new job ID is set
  useEffect(() => {
    if (activeJobId) pollJob(activeJobId);
  }, [activeJobId, pollJob]);

  const handleIngest = async (sourceIndex?: number) => {
    try {
      setError(null);
      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceIndex !== undefined ? { sourceIndex } : {}),
      });
      if (res.status === 409) {
        setError('A job is already running');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { jobId } = await res.json();
      setActiveJob(null);
      setActiveJobId(jobId);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isRunning = activeJob?.status === 'running';
  const progress = activeJob?.progress;

  const lastJobForSource = (label: string) =>
    statusData?.recentJobs.find(j => j.target === label || j.target === 'all sources');

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ingestion</h3>
        <Button size="sm" onClick={() => handleIngest()} disabled={isRunning}>
          All
        </Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Progress bar for active job */}
      {isRunning && (
        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            <span>{activeJob.target}</span>
            {progress && (
              <span>{progress.processed} / {progress.total}</span>
            )}
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: progress && progress.total > 0
                  ? `${Math.round((progress.processed / progress.total) * 100)}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Source cards */}
      <div className={styles.sources}>
        {statusData?.sources.map(source => {
          const lastJob = lastJobForSource(source.label);
          const isSourceRunning = isRunning && (
            activeJob?.target === source.label || activeJob?.target === 'all sources'
          );

          return (
            <div key={source.index} className={styles.sourceCard}>
              <div className={styles.sourceHeader}>
                <span className={styles.sourceLabel}>{source.label}</span>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => handleIngest(source.index)}
                  disabled={isRunning}
                >
                  Ingest
                </Button>
              </div>
              <div className={styles.sourceMeta}>
                <span className={styles.collectionTag}>{source.collection}</span>
                {lastJob && !isSourceRunning && (
                  <span className={`${styles.statusBadge} ${styles[lastJob.status]}`}>
                    {lastJob.status}
                  </span>
                )}
                {isSourceRunning && (
                  <span className={`${styles.statusBadge} ${styles.running}`}>running…</span>
                )}
              </div>
              {lastJob?.summary && (
                <div className={styles.summary}>
                  {lastJob.summary.filesProcessed}p · {lastJob.summary.filesSkipped}s
                  {lastJob.summary.filesFailed > 0 && (
                    <span className={styles.failed}> · {lastJob.summary.filesFailed}f</span>
                  )}
                  {' · '}{lastJob.summary.totalChunks} chunks
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      {statusData && (
        <div className={styles.footer}>
          <span>{statusData.totalIndexed} files indexed</span>
          {statusData.lastRun && (
            <span>{formatDate(statusData.lastRun)}</span>
          )}
        </div>
      )}
    </div>
  );
}
