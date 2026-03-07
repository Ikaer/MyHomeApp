/**
 * Qdrant HTTP API wrapper
 * Uses Qdrant REST API directly — no SDK needed.
 * Collection uses mxbai-embed-large vectors: 1024 dimensions, cosine distance.
 */

import { QdrantPoint, RagChunkPayload, ParentDocPayload, ParentQdrantPoint } from '@/models/rag';
import type { QueryFilter } from './queryFilterExtractor';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const VECTOR_SIZE = 1024; // mxbai-embed-large output dimension

export interface SearchResult {
  id: string;
  score: number;
  payload: RagChunkPayload;
}

async function qdrantFetch(path: string, options?: RequestInit): Promise<any> {
  const response = await fetch(`${QDRANT_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Qdrant request failed [${response.status}] ${path}: ${body}`);
  }

  return response.json();
}

export async function collectionExists(name: string): Promise<boolean> {
  try {
    await qdrantFetch(`/collections/${name}`);
    return true;
  } catch {
    return false;
  }
}

export async function createCollection(name: string): Promise<void> {
  await qdrantFetch(`/collections/${name}`, {
    method: 'PUT',
    body: JSON.stringify({
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    }),
  });
}

export async function ensureCollection(name: string): Promise<void> {
  if (!(await collectionExists(name))) {
    await createCollection(name);
  }
}

const UPSERT_BATCH_SIZE = 500; // max points per single Qdrant upsert request

export async function upsertPoints(collectionName: string, points: QdrantPoint[]): Promise<void> {
  // Split into batches to avoid sending a single massive payload (e.g. 12k vectors at once)
  for (let i = 0; i < points.length; i += UPSERT_BATCH_SIZE) {
    const batch = points.slice(i, i + UPSERT_BATCH_SIZE);
    if (points.length > UPSERT_BATCH_SIZE) {
      console.log(`[qdrant] Upserting batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}/${Math.ceil(points.length / UPSERT_BATCH_SIZE)} (${batch.length} points)…`);
    }
    await qdrantFetch(`/collections/${collectionName}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({ points: batch }),
    });
  }
}

export async function deletePoints(collectionName: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await qdrantFetch(`/collections/${collectionName}/points/delete?wait=true`, {
    method: 'POST',
    body: JSON.stringify({ points: ids }),
  });
}

export async function searchPoints(
  collectionName: string,
  vector: number[],
  topK: number = 5,
  categories?: string[],
  docFilter?: QueryFilter | null,
): Promise<SearchResult[]> {
  const body: Record<string, any> = {
    vector,
    limit: topK,
    with_payload: true,
  };

  // Build must clauses: categories filter + doc identifier filters
  const mustClauses: any[] = [];

  if (categories && categories.length > 0) {
    mustClauses.push({ key: 'categories', match: { any: categories } });
  }
  if (docFilter?.doc_type) {
    mustClauses.push({ key: 'docIdentifiers.doc_type', match: { value: docFilter.doc_type } });
  }
  if (docFilter?.year) {
    mustClauses.push({ key: 'docIdentifiers.year', match: { value: docFilter.year } });
  }
  if (docFilter?.month) {
    mustClauses.push({ key: 'docIdentifiers.month', match: { value: docFilter.month } });
  }

  if (mustClauses.length > 0) {
    body.filter = { must: mustClauses };
  }

  const result = await qdrantFetch(`/collections/${collectionName}/points/search`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return (result.result || []).map((r: any) => ({
    id: r.id,
    score: r.score,
    payload: r.payload as RagChunkPayload,
  }));
}

export async function getCollectionInfo(name: string): Promise<{ vectorsCount: number } | null> {
  try {
    const result = await qdrantFetch(`/collections/${name}`);
    return { vectorsCount: result.result?.vectors_count ?? 0 };
  } catch {
    return null;
  }
}

// ── Parent document collection ────────────────────────────────────────────────
// Companion collection that stores the full document text keyed by parent_id.
// Chunks in the main collection are pointers here; this is what the LLM reads.
// Uses a 1-dim dummy vector — fetched by ID only, never vector-searched.

export function parentsCollectionName(chunksCollection: string): string {
  return `${chunksCollection}_parents`;
}

export async function ensureParentCollection(name: string): Promise<void> {
  if (!(await collectionExists(name))) {
    await qdrantFetch(`/collections/${name}`, {
      method: 'PUT',
      body: JSON.stringify({
        vectors: { size: 1, distance: 'Cosine' }, // 1-dim dummy — never searched
      }),
    });
  }
}

export async function upsertParents(
  collectionName: string,
  parents: ParentQdrantPoint[],
): Promise<void> {
  if (parents.length === 0) return;
  await qdrantFetch(`/collections/${collectionName}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({ points: parents }),
  });
}

/**
 * Fetch parent documents by UUID — no vector search, direct point lookup.
 */
export async function fetchParentsByIds(
  collectionName: string,
  ids: string[],
): Promise<Array<{ id: string; payload: ParentDocPayload }>> {
  if (ids.length === 0) return [];
  const result = await qdrantFetch(`/collections/${collectionName}/points`, {
    method: 'POST',
    body: JSON.stringify({ ids, with_payload: true }),
  });
  return (result.result ?? []).map((r: any) => ({
    id: r.id as string,
    payload: r.payload as ParentDocPayload,
  }));
}

export async function deleteParents(
  collectionName: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await qdrantFetch(`/collections/${collectionName}/points/delete?wait=true`, {
    method: 'POST',
    body: JSON.stringify({ points: ids }),
  });
}
