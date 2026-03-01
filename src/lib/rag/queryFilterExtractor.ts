/**
 * Query-time filter extraction — Step 3 of the improved RAG strategy.
 *
 * Before running vector search, extract structured filters from the user's
 * natural-language query.  These are passed to Qdrant as `must` conditions,
 * narrowing the search to exactly the document type and time period the user
 * is asking about.
 *
 * Example:
 *   Query:  "peut tu me donner mon salaire pour chaque mois en 2021?"
 *   Filter: { doc_type: "payslip", year: 2021 }
 *   Effect: Qdrant skips CGV, bank statements, tax notices entirely.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const LLM_MODEL = 'llama3.1:8b'; // Fast small model — not the answer model

export interface QueryFilter {
  doc_type: 'payslip' | 'invoice' | 'contract' | 'tax_notice' | 'bank_statement' | 'insurance' | null;
  year: number | null;
  month: number | null;
}

const FILTER_SYSTEM_PROMPT = [
  'You are a search filter extractor for a personal document assistant.',
  'Read the user query and extract search filters.',
  'Respond ONLY with a valid JSON object — no markdown fences, no explanation.',
  'Use exactly this schema:',
  '{',
  '  "doc_type": one of "payslip"|"invoice"|"contract"|"tax_notice"|"bank_statement"|"insurance" or null,',
  '  "year": 4-digit integer or null,',
  '  "month": integer 1-12 or null',
  '}',
  'Use null if the filter cannot be determined from the query.',
  'French document vocabulary: "salaire/bulletin de paie" → payslip, "facture" → invoice,',
  '"contrat" → contract, "impôt/avis d\'imposition/déclaration" → tax_notice,',
  '"relevé de compte/bancaire" → bank_statement, "attestation/mutuelle/assurance" → insurance.',
  'Month names (French): janvier=1, février=2, mars=3, avril=4, mai=5, juin=6,',
  'juillet=7, août=8, septembre=9, octobre=10, novembre=11, décembre=12.',
  'If the query covers multiple months or years, use null for month/year.',
].join('\n');

/**
 * Extract structured Qdrant filters from a natural language query.
 * Returns null if no meaningful filter could be extracted (fallback: no filter = full collection search).
 */
export async function extractQueryFilters(question: string): Promise<QueryFilter | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: FILTER_SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        stream: false,
        options: { temperature: 0, num_predict: 60 },
        format: 'json',
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw: string = (data.message?.content ?? data.response ?? '').trim();
    if (!raw) throw new Error('Empty response');

    const parsed = JSON.parse(raw) as Partial<QueryFilter>;

    const validTypes = ['payslip', 'invoice', 'contract', 'tax_notice', 'bank_statement', 'insurance'];
    const filter: QueryFilter = {
      doc_type: validTypes.includes(parsed.doc_type as string)
        ? (parsed.doc_type as QueryFilter['doc_type'])
        : null,
      year: typeof parsed.year === 'number' && parsed.year > 1900 ? parsed.year : null,
      month: typeof parsed.month === 'number' && parsed.month >= 1 && parsed.month <= 12 ? parsed.month : null,
    };

    // If all null, skip the filter entirely — no point adding an empty filter
    const hasAnyFilter = filter.doc_type !== null || filter.year !== null || filter.month !== null;
    if (!hasAnyFilter) return null;

    console.log(`[queryFilter] Extracted: doc_type=${filter.doc_type}, year=${filter.year}, month=${filter.month}`);
    return filter;
  } catch (err) {
    console.warn('[queryFilter] Extraction failed, proceeding without filter:', err);
    return null; // safe fallback: full collection search
  }
}
