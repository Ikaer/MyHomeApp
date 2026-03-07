/**
 * LLM-based chunk context generation.
 *
 * Instead of embedding raw extracted text (garbled PDF columns, numbers with no context),
 * we ask the LLM to produce a concise natural-language description of each chunk.
 * That description is what gets embedded — the raw text is kept separately in the payload
 * for the answer-generation step at query time.
 *
 * This mirrors exactly what the vision pipeline already does for images:
 * llava describes the image → the description is embedded → queries match it.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const LLM_MODEL = 'llama3.1:8b';

const SYSTEM_PROMPT = [
  'You are a document indexing assistant.',
  'Your only job is to write a single concise description (max 80 words) of the document excerpt provided.',
  'The description must:',
  '  - Identify what kind of document it is (payslip, invoice, contract, report, identity document, etc.)',
  '  - Include the time period it covers (month, year, date range) if present in the content or filename',
  '  - Include any person names, company names, or identifiers clearly present in the text',
  '  - Mention the presence of financial data (e.g. "contains salary figures" or "contains tax amounts") WITHOUT citing specific amounts',
  '  - Be in the same language as the document (usually French)',
  'IMPORTANT: Do NOT cite specific monetary amounts or numeric values — they are often out of context in an excerpt and lead to errors.',
  'Do NOT invent any information not present in the content or filename.',
  'Reply with ONLY the description — no preamble, no quotes, no formatting.',
].join('\n');

const CONTEXT_CONCURRENCY = 4; // LLM inference is heavy — keep parallelism modest

/**
 * Files with more chunks than this threshold are "long documents" (legal terms,
 * reports, manuals…).  For these we make a single LLM call to produce a
 * document-level summary, then prefix every chunk with that summary instead of
 * generating an individual description per chunk.
 * This reduces 316 LLM calls → 1 for a 62-page PDF.
 */
const LONG_DOC_CHUNK_THRESHOLD = 30;

const DOC_SUMMARY_PROMPT = [
  'You are a document indexing assistant.',
  'Write a single sentence (max 40 words) describing what this document is about.',
  'Include: document type, issuing organization if present, topic/subject matter.',
  'Be in the same language as the document (usually French).',
  'Reply with ONLY the sentence — no preamble, no quotes.',
].join('\n');

/** Generate a single document-level summary from the first chunk(s) of a long file. */
async function generateDocSummary(
  firstChunks: string[],
  fileName: string,
  categories: string[],
): Promise<string> {
  const excerpt = firstChunks.slice(0, 3).join('\n').slice(0, 2000);
  const userMessage = `Filename: ${fileName}\nCategories: ${categories.join(', ')}\nContent:\n${excerpt}`;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: DOC_SUMMARY_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { temperature: 0, num_predict: 60 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const summary: string = (data.message?.content ?? data.response ?? '').trim();
    if (!summary) throw new Error('Empty summary');
    return summary;
  } catch (err) {
    console.warn(`[contextGenerator] Doc summary failed for "${fileName}":`, err);
    return `${fileName} | ${categories.join(', ')}`;
  }
}

/**
 * Generate semantic descriptions for a batch of chunks with bounded concurrency.
 * All chunks belong to the same file (same fileName + categories).
 *
 * Short docs (≤ LONG_DOC_CHUNK_THRESHOLD chunks): one LLM call per chunk — rich context.
 * Long docs (> threshold): one LLM call for the whole doc → prefix each chunk with it.
 */
export async function generateContextBatch(
  rawTexts: string[],
  fileName: string,
  categories: string[],
): Promise<string[]> {
  // Long document fast-path: one summary + cheap prefix per chunk
  if (rawTexts.length > LONG_DOC_CHUNK_THRESHOLD) {
    console.log(`[contextGenerator] Long doc (${rawTexts.length} chunks) — using doc-level summary for ${fileName}`);
    const docSummary = await generateDocSummary(rawTexts, fileName, categories);
    return rawTexts.map(t => `${docSummary}\n${t.slice(0, 400)}`);
  }

  const results: string[] = new Array(rawTexts.length);
  let completed = 0;

  for (let i = 0; i < rawTexts.length; i += CONTEXT_CONCURRENCY) {
    const window = rawTexts.slice(i, i + CONTEXT_CONCURRENCY);
    const windowResults = await Promise.all(
      window.map(t => generateChunkContext(t, fileName, categories)),
    );
    for (let j = 0; j < windowResults.length; j++) {
      results[i + j] = windowResults[j];
    }
    completed += window.length;
    if (rawTexts.length > 20 && completed % 20 < CONTEXT_CONCURRENCY) {
      console.log(`[contextGenerator] ${completed}/${rawTexts.length} contexts generated for ${fileName}…`);
    }
  }

  return results;
}

export async function generateChunkContext(
  rawText: string,
  fileName: string,
  categories: string[],
): Promise<string> {
  const userMessage = [
    `Filename: ${fileName}`,
    `Categories: ${categories.join(', ')}`,
    `Content excerpt:`,
    rawText.slice(0, 1500), // cap input — context gen doesn't need the full chunk
  ].join('\n');

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: {
          temperature: 0,      // deterministic — same doc should always get same description
          num_predict: 120,    // ~80 words max, no need for more
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama context gen failed [${res.status}]: ${body}`);
    }

    const data = await res.json();
    const context: string = (data.message?.content ?? data.response ?? '').trim();

    if (!context) throw new Error('Empty context returned by LLM');
    return context;
  } catch (err) {
    // Fallback: prepend filename + categories to raw text so at minimum the metadata is embedded
    console.warn(`[contextGenerator] Failed for "${fileName}", using fallback:`, err);
    return `${fileName} | ${categories.join(', ')}\n${rawText.slice(0, 500)}`;
  }
}
