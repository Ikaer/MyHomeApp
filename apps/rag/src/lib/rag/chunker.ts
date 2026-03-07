/**
 * Text chunking with overlap.
 * Splits text into chunks of ~CHUNK_SIZE characters with CHUNK_OVERLAP overlap.
 * Attempts to break at natural boundaries (newlines, sentences, spaces).
 *
 * Chunk size is 400 chars so that after the identifier prefix is prepended
 * (~60-120 chars) the total stays under the 500-char hard cap enforced by the
 * embedder (mxbai-embed-large BERT tokenizer: worst-case 1 char = 1 token,
 * 512-token context window).
 */

const DEFAULT_CHUNK_SIZE = 400;   // leaves ~100 chars headroom for identifier prefix
const DEFAULT_CHUNK_OVERLAP = 80; // ~20% overlap

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(text: string, options?: ChunkOptions): string[] {
  const size = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_CHUNK_OVERLAP;

  // Normalize whitespace: collapse multiple blank lines
  const normalized = text.replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = start + size;

    if (end < normalized.length) {
      // Prefer breaking at double newline (paragraph boundary)
      const lastDoubleNewline = normalized.lastIndexOf('\n\n', end);
      // Then single newline
      const lastNewline = normalized.lastIndexOf('\n', end);
      // Then sentence end
      const lastPeriod = normalized.lastIndexOf('. ', end);
      // Then space
      const lastSpace = normalized.lastIndexOf(' ', end);

      const minBreak = start + Math.floor(size * 0.5);
      const candidates = [lastDoubleNewline, lastNewline, lastPeriod, lastSpace]
        .filter(pos => pos > minBreak)
        .sort((a, b) => b - a); // prefer latest (largest) position

      if (candidates.length > 0) {
        end = candidates[0] + 1; // include the boundary char
      }
    }

    const chunk = normalized.slice(start, Math.min(end, normalized.length)).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= normalized.length) break;
  }

  return chunks;
}
