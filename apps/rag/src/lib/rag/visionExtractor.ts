/**
 * Vision-based text extraction via Ollama llava.
 * Used for:
 * - Image files (.png, .jpg, .jpeg)
 * - Scanned PDFs (pages converted to images via pdf2pic)
 *
 * Requires poppler-utils installed in the Docker container (for pdf2pic).
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const VISION_MODEL = 'llava:13b';

const EXTRACTION_PROMPT = [
  'You are a document text extractor. Extract ALL text visible in this image.',
  'Include every word, number, date, and piece of structured data exactly as written.',
  'Preserve the logical reading order. Do not summarize or interpret.',
  'If this is a payslip or financial document, make sure to include all line items and amounts.',
  'Output only the extracted text, nothing else.',
].join(' ');

/**
 * Send a single image (as base64) to Ollama llava and return extracted text.
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      prompt: EXTRACTION_PROMPT,
      images: [imageBase64],
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama vision failed [${response.status}]: ${body}`);
  }

  const data = await response.json();
  return (data.response || '').trim();
}

/**
 * Extract text from an image file (.png, .jpg, .jpeg).
 */
export async function extractFromImageFile(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  return extractTextFromImage(base64);
}

/**
 * Convert a specific page of a PDF to a PNG image buffer using pdf2pic.
 * Requires poppler-utils (pdftoppm) in the system PATH.
 * Returns null if conversion is unavailable (e.g. Windows dev environment).
 */
async function pdfPageToBase64(filePath: string, pageNumber: number): Promise<string | null> {
  try {
    const { fromPath } = await import('pdf2pic');

    const tmpDir = path.join(os.tmpdir(), `rag_pdf_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const convert = fromPath(filePath, {
      density: 150,
      saveFilename: 'page',
      savePath: tmpDir,
      format: 'png',
      width: 1920,
      height: 2480,
    });

    const result = await convert(pageNumber, { responseType: 'base64' });

    // Clean up temp dir and return (ToBase64Response has no .path)
    try {
      fs.rm(tmpDir, { recursive: true }, () => {});
    } catch {
      // cleanup failure is non-fatal
    }

    return result.base64 ?? null;
  } catch (err) {
    // pdf2pic / poppler not available (dev environment or missing system package)
    console.warn(`pdf2pic unavailable for page ${pageNumber} of ${filePath}:`, err);
    return null;
  }
}

/**
 * Extract text from a scanned PDF by converting each page to an image
 * and running it through the vision model.
 * pageCount should come from the initial pdf-parse attempt.
 */
export async function extractFromScannedPdf(
  filePath: string,
  pageCount: number
): Promise<{ pageTexts: string[]; extractedPages: number }> {
  const pageTexts: string[] = [];
  let extractedPages = 0;

  for (let page = 1; page <= pageCount; page++) {
    const base64 = await pdfPageToBase64(filePath, page);
    if (base64) {
      const text = await extractTextFromImage(base64);
      pageTexts.push(text);
      extractedPages++;
    } else {
      // If conversion fails for any page, push empty string and continue
      pageTexts.push('');
    }
  }

  return { pageTexts, extractedPages };
}
