/**
 * Text embedding via Ollama nomic-embed-text.
 * POST http://OLLAMA_URL/api/embeddings
 *
 * Each call is wrapped with a per-request timeout and automatic retries
 * (exponential back-off) to survive transient connection resets — especially
 * important when embedding thousands of records sequentially.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const EMBED_MODEL = 'mxbai-embed-large';

const REQUEST_TIMEOUT_MS = 30_000;  // 30 s per single embedding call
const MAX_RETRIES        = 3;
const RETRY_BASE_DELAY   = 1_000;   // 1 s, doubles each attempt
// mxbai-embed-large uses a BERT tokenizer: worst-case (digits, special chars)
// tokenizes at ~1 char/token. The hard limit is 512 tokens, so 500 chars is the
// only truly safe ceiling regardless of content type.
const MAX_EMBED_CHARS = 500;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function embedText(text: string): Promise<number[]> {
  // Hard guard: truncate to model context limit before sending
  const input = text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const response = await fetchWithTimeout(
        `${OLLAMA_URL}/api/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: EMBED_MODEL, prompt: input }),
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama embedding failed [${response.status}]: ${body}`);
      }

      const data = await response.json();
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error(`Ollama embedding response missing 'embedding' field`);
      }

      return data.embedding as number[];
    } catch (err) {
      lastError = err;
      const isLast = attempt === MAX_RETRIES;
      console.warn(`[embedder] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed${isLast ? ' — giving up' : ' — retrying'}:`, (err as Error).message);
    }
  }

  throw lastError;
}

/**
 * Embed multiple texts with bounded concurrency.
 * Ollama queues concurrent requests and handles them safely.
 * Running N requests in parallel hides per-request network round-trip latency
 * without overwhelming the GPU.
 *
 * Logs progress every 100 items for long runs.
 */
const EMBED_CONCURRENCY = 8; // simultaneous in-flight requests to Ollama

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);
  let completed = 0;

  // Process in windows of EMBED_CONCURRENCY
  for (let i = 0; i < texts.length; i += EMBED_CONCURRENCY) {
    const window = texts.slice(i, i + EMBED_CONCURRENCY);
    const windowResults = await Promise.all(window.map(t => embedText(t)));
    for (let j = 0; j < windowResults.length; j++) {
      results[i + j] = windowResults[j];
    }
    completed += window.length;
    if (texts.length > 100 && completed % 100 < EMBED_CONCURRENCY) {
      console.log(`[embedder] ${completed}/${texts.length} embeddings done…`);
    }
  }

  return results;
}
