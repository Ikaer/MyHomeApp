/**
 * POST /api/rag/ingest  — start an ingestion job
 * GET  /api/rag/ingest  — list recent jobs + manifest status
 *
 * POST body (all optional):
 *   { sourceIndex?: number }   — ingest only sources[sourceIndex], omit for all sources
 *
 * POST response: { jobId: string, target: string }
 * Track progress via GET /api/rag/ingest/[jobId]
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ingestAll, ingestSource, getIngestStatus } from '@/lib/rag/ingestor';
import { readRagConfig } from '@/lib/rag/ragConfig';
import { createJob, completeJob, failJob, isAnyJobRunning, listJobs, stopStaleJobs, updateJobProgress, appendJobLog } from '@/lib/rag/jobStore';

// Mark any jobs left running from a previous process/restart as 'stopped'
stopStaleJobs('Process restarted');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':  return handleList(res);
      case 'POST': return handleIngest(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end('Method Not Allowed');
    }
  } catch (error: any) {
    console.error('[RAG ingest] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function handleList(res: NextApiResponse) {
  return res.status(200).json({
    ...getIngestStatus(),
    recentJobs: listJobs(10),
  });
}

async function handleIngest(req: NextApiRequest, res: NextApiResponse) {
  if (isAnyJobRunning()) {
    return res.status(409).json({ error: 'An ingestion job is already running' });
  }

  const { sourceIndex }: { sourceIndex?: number } = req.body ?? {};
  const config = readRagConfig();

  if (sourceIndex !== undefined) {
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= config.sources.length) {
      return res.status(400).json({
        error: `sourceIndex out of range. Config has ${config.sources.length} source(s) (0–${config.sources.length - 1}).`,
      });
    }
  }

  const target = sourceIndex !== undefined ? config.sources[sourceIndex].label : 'all sources';
  const job = createJob(target, sourceIndex);

  // For single-source ingest, resolve the collection now so it appears in logs
  const sourceCollection = sourceIndex !== undefined
    ? (config.sources[sourceIndex].collection ?? config.collection)
    : config.collection;

  // Respond immediately with the job ID
  res.status(202).json({ jobId: job.id, target });

  // Intercept console output for the duration of this job so every log line
  // is captured in <jobId>.log next to the <jobId>.json summary file.
  // Safe to do globally because only one job can run at a time.
  const origLog   = console.log;
  const origError = console.error;
  const origWarn  = console.warn;

  const makeInterceptor = (level: 'LOG' | 'ERROR' | 'WARN', orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      orig(...args);
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      appendJobLog(job.id, `[${level}] ${msg}`);
    };

  console.log   = makeInterceptor('LOG',   origLog)   as typeof console.log;
  console.error = makeInterceptor('ERROR', origError) as typeof console.error;
  console.warn  = makeInterceptor('WARN',  origWarn)  as typeof console.warn;

  const restoreConsole = () => {
    console.log   = origLog;
    console.error = origError;
    console.warn  = origWarn;
  };

  // Fire-and-forget ingestion — updates the job file on completion/failure
  const run = sourceIndex !== undefined
    ? ingestSource(
        config.sources[sourceIndex],
        sourceCollection,
        r => console.log(`[RAG ingest][${job.id}][${target}] ${r.status}: ${r.filePath}`),
        (processed, total) => updateJobProgress(job.id, processed, total),
      )
    : ingestAll(
        (label, r) => console.log(`[RAG ingest][${job.id}][${label}] ${r.status}: ${r.filePath}`),
        (processed, total) => updateJobProgress(job.id, processed, total),
      );

  run
    .then(summary => {
      completeJob(job.id, summary);
      console.log(`[RAG ingest][${job.id}] Completed:`, JSON.stringify(summary));
    })
    .catch(err => {
      failJob(job.id, err.message ?? String(err));
      console.error(`[RAG ingest][${job.id}] Failed:`, err);
    })
    .finally(restoreConsole);
}

