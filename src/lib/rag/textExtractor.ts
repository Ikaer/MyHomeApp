/**
 * Text extraction for text-based file types.
 * - .txt, .md: read directly
 * - .pdf with text layer: use pdf-parse
 *
 * Returns extracted text and page count.
 * If the PDF has insufficient text (likely scanned), returns empty text
 * so the caller can fall back to the vision pipeline.
 */

import fs from 'fs';
import path from 'path';

// pdf-parse v2.x exports a class-based API (not a function).
// @types/pdf-parse is for v1 — we type it inline.
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText(): Promise<{ text: string; total: number }>;
  };
};

// Minimum average characters per page to consider a PDF as "text-based"
const MIN_CHARS_PER_PAGE = 100;

// Docling sidecar: converts PDFs to structured Markdown preserving table layout.
// Set DOCLING_URL (e.g. http://myhomeapp-docling:8000) to enable.
// Falls back to pdf-parse if the env var is unset or the sidecar is unreachable.
const DOCLING_URL = process.env.DOCLING_URL;

export interface ExtractedText {
  text: string;
  pages: number;
}

export async function extractTextFromFile(filePath: string): Promise<ExtractedText> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md' || ext === '.csv') {
    const text = fs.readFileSync(filePath, 'utf-8');
    return { text, pages: 1 };
  }

  if (ext === '.pdf') {
    return extractTextFromPdf(filePath);
  }

  // Images and unknown types — return empty to trigger vision pipeline
  return { text: '', pages: 1 };
}

async function extractTextFromPdf(filePath: string): Promise<ExtractedText> {
  // 1. Try Docling sidecar — produces structured Markdown preserving table layout
  if (DOCLING_URL) {
    // Retry up to 3 times with 3-second gaps to handle the startup race where
    // Next.js begins ingesting before the Docling process has finished loading.
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 3_000;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`${DOCLING_URL}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath }),
          signal: AbortSignal.timeout(180_000), // 3 min for large PDFs
        });
        if (res.ok) {
          const data = await res.json();
          if (data.markdown && data.markdown.length > 50) {
            return { text: data.markdown, pages: data.pages ?? 1 };
          }
        } else {
          console.warn(`[textExtractor] Docling returned HTTP ${res.status} for ${filePath}, falling back to pdf-parse`);
          break; // HTTP error — server is up but rejected the request, no point retrying
        }
      } catch (err) {
        const isConnRefused = (err as Error).message?.includes('fetch failed') ||
                              (err as Error).message?.includes('ECONNREFUSED');
        if (isConnRefused && attempt < MAX_ATTEMPTS) {
          console.warn(`[textExtractor] Docling not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        console.warn(`[textExtractor] Docling sidecar unavailable, falling back to pdf-parse:`, (err as Error).message);
        break;
      }
    }
  }

  // 2. Fallback: pdf-parse (no table structure, but works without the sidecar)
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return { text: result.text || '', pages: result.total || 1 };
  } catch (error) {
    console.warn(`pdf-parse failed for ${filePath}:`, error);
    return { text: '', pages: 1 };
  }
}

/**
 * Returns true if the extracted text is rich enough to skip the vision pipeline.
 */
export function isTextSufficient(extracted: ExtractedText): boolean {
  const avgCharsPerPage = extracted.text.length / Math.max(extracted.pages, 1);
  return avgCharsPerPage >= MIN_CHARS_PER_PAGE;
}
