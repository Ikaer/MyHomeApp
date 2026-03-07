/**
 * Document identifier extraction — Step 2 of the improved RAG strategy.
 *
 * One LLM call per file at ingest time to extract structured global identifiers
 * (doc_type, person name, date, company).  These are then:
 *   1. Prepended to every chunk before embedding  → vectors land in the right semantic space
 *   2. Stored in the Qdrant payload               → available for hybrid filtering at query time
 *
 * This replaces the per-chunk contextGenerator approach which was producing
 * hallucinated amounts because a bare column of numbers has no label context.
 * The identifier extraction never asks for amounts — only for metadata that
 * is unambiguously present at the top of the document.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const LLM_MODEL = 'llama3.1:8b'; // Fast small model for extraction — not the answer model

export interface DocIdentifiers {
  doc_type: 'payslip' | 'invoice' | 'contract' | 'tax_notice' | 'bank_statement' | 'insurance' | 'other';
  employee_name: string | null;
  company_name: string | null;
  doc_date: string | null;  // ISO "YYYY-MM-DD" or partial "YYYY-MM"
  year: number | null;
  month: number | null;     // 1-12
}

const IDENTIFIER_SYSTEM_PROMPT = [
  'You are a document metadata extractor.',
  'Read the document excerpt and filename provided, then extract structured metadata.',
  'Respond ONLY with a valid JSON object — no markdown fences, no explanation, no extra text.',
  'Use exactly this schema:',
  '{',
  '  "doc_type": one of "payslip"|"invoice"|"contract"|"tax_notice"|"bank_statement"|"insurance"|"other",',
  '  "employee_name": full name string or null,',
  '  "company_name": employer or issuing company name only (NOT the address) or null,',
  '  "doc_date": ISO date "YYYY-MM-DD" or partial "YYYY-MM" or null,',
  '  "year": 4-digit integer or null,',
  '  "month": integer 1-12 or null',
  '}',
  'Use null for any field not clearly and unambiguously present in the text.',
  'Never invent or guess values.',
  'For company_name: extract ONLY the legal name (e.g. "COMPARIO"), never include street, city, or postal code.',
  'For employee_name: look for "M", "Mme", "M.", "Mr" followed by a name, or a "Nom" field.',
  'For payslips: doc_date is the pay period ("Période du..."), not the payment date.',
  'For doc_date and year/month use the document period, not a payment date.',
].join('\n');

/** Build a human-readable prefix string from extracted identifiers. */
export function buildIdentifierPrefix(ids: DocIdentifiers): string {
  const parts: string[] = [];
  const typeLabels: Record<DocIdentifiers['doc_type'], string> = {
    payslip: 'Bulletin de paie',
    invoice: 'Facture',
    contract: 'Contrat',
    tax_notice: 'Avis d\'imposition',
    bank_statement: 'Relevé bancaire',
    insurance: 'Attestation / Assurance',
    other: 'Document',
  };
  parts.push(typeLabels[ids.doc_type] ?? 'Document');
  if (ids.employee_name) parts.push(ids.employee_name);
  if (ids.company_name) parts.push(ids.company_name);
  // Only use doc_date if it is a valid ISO partial date (YYYY-MM-DD or YYYY-MM).
  // Non-conforming values (e.g. date ranges like "01/02/22-28/02/22") fall back to year/month.
  const isValidIsoDate = ids.doc_date && /^\d{4}-\d{2}(-\d{2})?$/.test(ids.doc_date);
  if (isValidIsoDate) parts.push(ids.doc_date!);
  else if (ids.year && ids.month) parts.push(`${String(ids.month).padStart(2, '0')}/${ids.year}`);
  else if (ids.year) parts.push(String(ids.year));
  return `[${parts.join(' | ')}]`;
}

/**
 * Extract global document identifiers from the first portion of a file's text.
 * Falls back to a minimal identifier object derived from the filename on failure.
 */
export async function extractDocIdentifiers(
  firstChunkText: string,
  fileName: string,
  categories: string[],
): Promise<DocIdentifiers> {
  const excerpt = firstChunkText.slice(0, 2000);
  const userMessage = `Filename: ${fileName}\nCategories: ${categories.join(', ')}\n\nDocument excerpt:\n${excerpt}`;

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: IDENTIFIER_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { temperature: 0, num_predict: 120 },
        format: 'json',
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw: string = (data.message?.content ?? data.response ?? '').trim();
    if (!raw) throw new Error('Empty response');

    const parsed = JSON.parse(raw) as Partial<DocIdentifiers>;

    // Validate doc_type
    const validTypes = ['payslip', 'invoice', 'contract', 'tax_notice', 'bank_statement', 'insurance', 'other'];
    const doc_type = validTypes.includes(parsed.doc_type as string)
      ? (parsed.doc_type as DocIdentifiers['doc_type'])
      : 'other';

    const result: DocIdentifiers = {
      doc_type,
      employee_name: parsed.employee_name ?? null,
      company_name: parsed.company_name ?? null,
      doc_date: parsed.doc_date ?? null,
      year: typeof parsed.year === 'number' ? parsed.year : null,
      month: typeof parsed.month === 'number' ? parsed.month : null,
    };

    console.log(`[docIdentifier] ${fileName} → ${buildIdentifierPrefix(result)}`);
    return result;
  } catch (err) {
    console.warn(`[docIdentifier] Extraction failed for "${fileName}", using filename fallback:`, err);
    // Fallback: parse year/month from filename pattern like "2021-02" or "202102"
    const yearMonthMatch = fileName.match(/(\d{4})[-_]?(\d{2})/);
    return {
      doc_type: 'other',
      employee_name: null,
      company_name: null,
      doc_date: yearMonthMatch ? `${yearMonthMatch[1]}-${yearMonthMatch[2]}` : null,
      year: yearMonthMatch ? parseInt(yearMonthMatch[1]) : null,
      month: yearMonthMatch ? parseInt(yearMonthMatch[2]) : null,
    };
  }
}
