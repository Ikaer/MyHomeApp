/**
 * GET /api/rag/preview?source=<index>
 *
 * Dry-run walk of a configured source — returns every file that WOULD be
 * ingested, with its resolved categories.  Nothing is written to Qdrant or
 * the manifest.  Use this to verify exclusion rules and category mappings
 * before triggering a full re-index.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { previewSourceFiles } from '@/lib/rag/ingestor';
import { readRagConfig } from '@/lib/rag/ragConfig';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const { source } = req.query;

  // No index supplied → list available sources
  if (source === undefined) {
    const config = readRagConfig();
    return res.status(200).json({
      sources: config.sources.map((s, i) => ({
        index: i,
        label: s.label,
        path: s.path,
        excludePaths: s.excludePaths ?? [],
      })),
    });
  }

  const sourceIndex = Number(source);
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0) {
    return res.status(400).json({ error: '`source` must be a non-negative integer index' });
  }

  try {
    const result = previewSourceFiles(sourceIndex);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
