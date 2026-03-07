/**
 * GET /api/rag/ingest/[jobId]  — get the status/result of a specific ingestion job
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { readJob } from '@/lib/rag/jobStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const { jobId } = req.query;
  if (typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Invalid jobId' });
  }

  const job = readJob(jobId);
  if (!job) {
    return res.status(404).json({ error: `Job ${jobId} not found` });
  }

  return res.status(200).json(job);
}
