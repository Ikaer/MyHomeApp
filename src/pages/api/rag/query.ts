/**
 * POST /api/rag/query  — answer a question using RAG, streamed via SSE
 *
 * Body: { question: string, topK?: number, categories?: string[], collection?: string }
 *
 * SSE event types:
 *   { type: 'status',  message: string }                      — progress hint
 *   { type: 'token',   token: string }                        — LLM output token
 *   { type: 'debug',   debugInfo: RagDebugInfo }              — diagnostics (just before done)
 *   { type: 'done',    sources: SourceReference[] }           — final event (answer complete)
 *   { type: 'error',   error: string }                        — unrecoverable error
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { embedText } from '@/lib/rag/embedder';
import { searchPoints, parentsCollectionName, fetchParentsByIds } from '@/lib/rag/qdrantClient';
import { buildRagPrompt } from '@/lib/rag/promptBuilder';
import { readRagConfig } from '@/lib/rag/ragConfig';
import { generateHypotheticalDocument } from '@/lib/rag/hydeGenerator';
import { extractQueryFilters } from '@/lib/rag/queryFilterExtractor';
import type { QueryRequest, SourceReference, ParentDoc, RagDebugInfo } from '@/models/rag';

export const config = { api: { responseLimit: false } };

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const LLM_MODEL = 'qwen2.5:14b';
const DEFAULT_TOP_K_UNFILTERED = 10;
const DEFAULT_TOP_K_FILTERED = 25; // more results when categories pre-filter the space

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { question, topK, collection, categories }: QueryRequest = req.body ?? {};

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'question is required' });
  }

  // ── SSE setup ──────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  };

  try {
    const ragConfig = readRagConfig();
    const k = topK ?? (categories && categories.length > 0 ? DEFAULT_TOP_K_FILTERED : DEFAULT_TOP_K_UNFILTERED);
    const collectionName = collection ?? ragConfig.collection;

    // 1. HyDE + query filter — run in parallel since they are independent.
    // HyDE: embed a hypothetical document excerpt instead of the raw question.
    // Query filter: extract doc_type/year/month to pre-narrow Qdrant search space.
    send({ type: 'status', message: 'Préparation de la requête…' });
    const [hypotheticalDoc, docFilter] = await Promise.all([
      generateHypotheticalDocument(question),
      extractQueryFilters(question),
    ]);
    send({ type: 'status', message: 'Embedding de la question…' });
    const questionVector = await embedText(hypotheticalDoc);

    // When filtering by year without a specific month (full-year query) there can
    // be up to 12–13 parent docs. Boost the parent limit and the raw chunk over-fetch
    // so all months are retrieved even with the default topK.
    const fullYearQuery = docFilter?.year != null && docFilter?.month == null;
    const parentDocLimit = fullYearQuery ? Math.max(k, 50) : k;

    // 2. Search — over-fetch by 3× so we can rank parentDocLimit unique files after grouping.
    // docFilter narrows the collection to matching doc_type/year before vector search.
    send({ type: 'status', message: 'Recherche dans les documents…' });
    const rawChunks = await searchPoints(collectionName, questionVector, parentDocLimit * 3, categories, docFilter);

    // ── Parent document retrieval ──────────────────────────────────────────────
    // Chunks are pointers to parent documents stored in {collection}_parents.
    // Deduplicate by parent_id, rank by best chunk score, fetch full document text,
    // and send complete documents to the LLM instead of arbitrary fragments.
    //
    // Legacy chunks (no parent_id, pre-reindex) fall back to filePath grouping.
    const parentGroups = new Map<string, typeof rawChunks>(); // key = parent_id or filePath
    for (const chunk of rawChunks) {
      const key = chunk.payload.parent_id ?? chunk.payload.filePath;
      if (!parentGroups.has(key)) parentGroups.set(key, []);
      parentGroups.get(key)!.push(chunk);
    }

    // Rank by best chunk score, take top parentDocLimit documents
    const rankedGroups = [...parentGroups.entries()]
      .sort(([, a], [, b]) => Math.max(...b.map(c => c.score)) - Math.max(...a.map(c => c.score)))
      .slice(0, parentDocLimit);

    if (rankedGroups.length === 0) {
      console.warn(`[RAG query] No results in "${collectionName}" for filter:`, docFilter);
      send({ type: 'done', answer: 'No relevant documents found in the index for this question.', sources: [] });
      return res.end();
    }

    // Fetch full document text from the parents collection
    const parentsCol = parentsCollectionName(collectionName);
    const parentIds = rankedGroups
      .map(([key, chunks]) => chunks[0].payload.parent_id ? key : null)
      .filter((id): id is string => id !== null);

    const fetchedParents = await fetchParentsByIds(parentsCol, parentIds).catch(() => []);
    const parentMap = new Map(fetchedParents.map(p => [p.id, p.payload]));

    // 3. Assemble ParentDoc[] — fall back to chunk content for legacy (no parent_id) chunks
    const parentDocs: ParentDoc[] = rankedGroups.map(([key, chunks]) => {
      const bestChunk = chunks.reduce((a, b) => (b.score > a.score ? b : a));
      const fetched = bestChunk.payload.parent_id ? parentMap.get(bestChunk.payload.parent_id) : undefined;
      return {
        fileName: bestChunk.payload.fileName,
        filePath: bestChunk.payload.filePath,
        fullText: fetched?.fullText ?? chunks.map(c => c.payload.content).join('\n\n'),
        identifierPrefix: fetched?.identifierPrefix ?? bestChunk.payload.embeddedContext,
        docIdentifiers: fetched?.docIdentifiers ?? bestChunk.payload.docIdentifiers,
        structuredData: fetched?.structuredData,
        categories: bestChunk.payload.categories,
        sourceLabel: bestChunk.payload.sourceLabel,
        score: bestChunk.score,
      };
    });

    // Build prompt with full parent documents
    const promptResult = buildRagPrompt(question, parentDocs);
    const { systemPrompt, userMessage } = promptResult;

    // Source references (one per parent document, for the UI)
    // Also annotate with debug char stats for export.
    const sources: SourceReference[] = rankedGroups.map(([key, chunks], i) => {
      const best = chunks.reduce((a, b) => (b.score > a.score ? b : a));
      const fromParents = best.payload.parent_id !== undefined && best.payload.parent_id !== null;
      const stat = promptResult.docStats[i];
      return {
        fileName: best.payload.fileName,
        filePath: best.payload.filePath,
        pageNumber: best.payload.pageNumber,
        excerpt: best.payload.content.slice(0, 300) + (best.payload.content.length > 300 ? '…' : ''),
        embeddedContext: best.payload.embeddedContext,
        score: best.score,
        categories: best.payload.categories,
        sourceLabel: best.payload.sourceLabel,
        charsInContext: stat?.charsUsed,
        charsTruncated: stat?.charsTruncated,
        fromParents,
      };
    });

    // Build debug info for export
    const docsFromParents = rankedGroups.filter(([, chunks]) => {
      const best = chunks.reduce((a, b) => (b.score > a.score ? b : a));
      return best.payload.parent_id !== undefined && best.payload.parent_id !== null;
    }).length;
    const debugInfo: RagDebugInfo = {
      model: LLM_MODEL,
      hydeDoc: hypotheticalDoc,
      queryFilter: docFilter,
      totalContextChars: promptResult.totalCharsUsed,
      contextBudgetChars: 200_000,
      perDocBudgetChars: promptResult.perDocBudgetChars,
      docsRetrieved: parentDocs.length,
      docsFromParents,
      docsFromLegacy: parentDocs.length - docsFromParents,
      docStats: promptResult.docStats.map((s, i) => ({
        ...s,
        fromParents: sources[i]?.fromParents ?? false,
      })),
    };

    // 4. Stream from Ollama
    send({ type: 'debug', debugInfo });
    send({ type: 'status', message: 'Generating answer…' });

    const llmResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        // Compute num_ctx from actual prompt size so Ollama allocates just enough KV cache.
        // Ollama's default (8 192) silently truncates prompts larger than ~6k tokens.
        // Formula: estimate tokens at ~3.5 chars/token, add 2 048 for output headroom,
        // round up to the next power of 2. Capped at 131 072 (fits on a 24 GB card).
        options: { num_ctx: (() => {
          const estimatedTokens = Math.ceil((systemPrompt.length + userMessage.length) / 3.5);
          const needed = estimatedTokens + 2048;
          const pow2 = Math.pow(2, Math.ceil(Math.log2(Math.max(needed, 8192))));
          return Math.min(pow2, 131072);
        })() },
      }),
    });

    if (!llmResponse.ok || !llmResponse.body) {
      const body = await llmResponse.text();
      throw new Error(`Ollama LLM failed [${llmResponse.status}]: ${body}`);
    }

    const reader = llmResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed);
          const token: string = data.message?.content ?? data.response ?? '';
          if (token) send({ type: 'token', token });
          if (data.done) {
            send({ type: 'done', sources });
            return res.end();
          }
        } catch {
          // ignore partial JSON lines between chunks
        }
      }
    }

    send({ type: 'done', sources });
    res.end();
  } catch (error: any) {
    console.error('[RAG query] Error:', error);
    send({ type: 'error', error: error.message ?? 'Internal server error' });
    res.end();
  }
}
