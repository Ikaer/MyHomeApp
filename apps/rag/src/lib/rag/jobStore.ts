/**
 * Persistent job store for RAG ingestion jobs.
 * Each job is stored as data/rag/jobs/{jobId}.json.
 * No shared file — reads and writes are isolated per job ID.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { IngestJob, IngestJobStatus, IngestJobProgress, IngestSummary } from '@/models/rag';
import { ensureDirectoryExists } from '@myhomeapp/shared/lib/data';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const JOBS_DIR = path.join(DATA_PATH, 'rag', 'jobs');

function jobPath(id: string): string {
  return path.join(JOBS_DIR, `${id}.json`);
}

export function logPath(id: string): string {
  return path.join(JOBS_DIR, `${id}.log`);
}

/**
 * Append a timestamped line to the job's .log file.
 * The file is created on first write alongside the .json job file.
 */
export function appendJobLog(id: string, line: string): void {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logPath(id), `[${timestamp}] ${line}\n`, 'utf-8');
  } catch {
    // best-effort — never throw from a logging helper
  }
}

export function createJob(target: string, sourceIndex?: number): IngestJob {
  ensureDirectoryExists(JOBS_DIR);

  const job: IngestJob = {
    id: crypto.randomUUID(),
    status: 'running',
    target,
    sourceIndex,
    startTime: new Date().toISOString(),
  };

  fs.writeFileSync(jobPath(job.id), JSON.stringify(job, null, 2), 'utf-8');
  return job;
}

export function readJob(id: string): IngestJob | null {
  const p = jobPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as IngestJob;
  } catch {
    return null;
  }
}

export function completeJob(id: string, summary: IngestSummary): void {
  const job = readJob(id);
  if (!job) return;
  job.status = 'completed';
  job.endTime = new Date().toISOString();
  job.summary = summary;
  fs.writeFileSync(jobPath(id), JSON.stringify(job, null, 2), 'utf-8');
}

export function failJob(id: string, error: string): void {
  const job = readJob(id);
  if (!job) return;
  job.status = 'failed';
  job.endTime = new Date().toISOString();
  job.error = error;
  fs.writeFileSync(jobPath(id), JSON.stringify(job, null, 2), 'utf-8');
}

/** List all jobs, newest first. */
export function listJobs(limit = 20): IngestJob[] {
  ensureDirectoryExists(JOBS_DIR);
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const jobs: IngestJob[] = [];

  for (const file of files) {
    try {
      jobs.push(JSON.parse(fs.readFileSync(path.join(JOBS_DIR, file), 'utf-8')) as IngestJob);
    } catch {
      // skip corrupt file
    }
  }

  return jobs
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, limit);
}

/** Returns true if any job file currently has status 'running'. */
export function isAnyJobRunning(): boolean {
  ensureDirectoryExists(JOBS_DIR);
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const job = JSON.parse(fs.readFileSync(path.join(JOBS_DIR, file), 'utf-8')) as IngestJob;
      if (job.status === 'running') return true;
    } catch {
      // skip
    }
  }
  return false;
}

/**
 * Mark all jobs with status 'running' as 'stopped'.
 * Called at process startup to clean up jobs interrupted by a restart.
 */
export function stopStaleJobs(reason: string = 'Process restarted'): void {
  ensureDirectoryExists(JOBS_DIR);
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(JOBS_DIR, file);
    try {
      const job = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as IngestJob;
      if (job.status === 'running') {
        job.status = 'stopped';
        job.stopReason = reason;
        job.endTime = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(job, null, 2), 'utf-8');
      }
    } catch {
      // skip corrupt file
    }
  }
}

/** Update the progress counters on a running job. */
export function updateJobProgress(id: string, processed: number, total: number): void {
  const job = readJob(id);
  if (!job || job.status !== 'running') return;
  const progress: IngestJobProgress = { processed, total };
  job.progress = progress;
  fs.writeFileSync(jobPath(id), JSON.stringify(job, null, 2), 'utf-8');
}
