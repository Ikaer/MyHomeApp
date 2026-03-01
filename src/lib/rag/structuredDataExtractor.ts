/**
 * Structured data extraction — extracts key numerical/date fields from documents
 * at ingest time using a fast LLM call.
 *
 * The extracted data is stored in the parents collection alongside the full text
 * and injected as a clean "Key figures" block at the top of the prompt at query
 * time.  This ensures the LLM sees precise values even when the raw OCR text is
 * garbled by complex table layouts.
 *
 * Currently implemented: payslip
 * Other doc types: returns undefined (no-op)
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const LLM_MODEL = 'llama3.1:8b'; // Fast small model — same as docIdentifierExtractor

// ── Schema types ──────────────────────────────────────────────────────────────

export interface PayslipStructuredData {
  doc_type: 'payslip';
  periode: string | null;          // "YYYY-MM"
  salaire_brut: number | null;
  net_avant_impot: number | null;  // "NET A PAYER AVANT IMPOT SUR LE REVENU"
  impot_source: number | null;     // "Impôt sur le revenu prélevé à la source"
  taux_prelevement: number | null; // withholding rate as plain percentage (e.g. 13.5)
  net_a_payer: number | null;      // final amount after income tax
}

export type StructuredData = PayslipStructuredData;

// ── Prompts ───────────────────────────────────────────────────────────────────

const PAYSLIP_SYSTEM_PROMPT = [
  'You are a payslip data extractor for French payslips (bulletins de paie).',
  'Read the provided text and extract the key financial figures.',
  'Respond ONLY with a valid JSON object — no markdown fences, no explanation, no extra text.',
  'Use exactly this schema:',
  '{',
  '  "doc_type": "payslip",',
  '  "periode": "YYYY-MM" string (pay period, not payment date) or null,',
  '  "salaire_brut": gross salary as a plain number (e.g. 3420.00) or null,',
  '  "net_avant_impot": "NET A PAYER AVANT IMPOT" figure as a plain number or null,',
  '  "impot_source": income tax withheld ("Impôt sur le revenu prélevé à la source") as plain number or null,',
  '  "taux_prelevement": withholding rate as plain percentage number (e.g. 13.5) or null,',
  '  "net_a_payer": final net amount paid after income tax deduction as plain number or null',
  '}',
  'French number format: convert "3 795,41" → 3795.41 (remove spaces, replace comma with dot).',
  'Never invent or guess values. Use null for anything not clearly present in the text.',
  'The NET A PAYER AVANT IMPOT and net_a_payer are different lines — extract both if present.',
].join('\n');

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Extract structured financial data from a document.
 * Returns undefined for unsupported doc types or on any failure.
 */
export async function extractStructuredData(
  fullText: string,
  docType: string,
  fileName: string,
): Promise<StructuredData | undefined> {
  if (docType !== 'payslip') return undefined;

  // Net figures appear at the bottom of French payslips — use the tail of the text.
  // Also include the head for the salaire brut (which appears in the middle table).
  const head = fullText.slice(0, 1500);
  const tail = fullText.length > 1500 ? fullText.slice(-2000) : '';
  const excerpt = tail ? `${head}\n...\n${tail}` : head;

  const userMessage = `Filename: ${fileName}\n\nPayslip text:\n${excerpt}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: PAYSLIP_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { temperature: 0 }, // deterministic extraction
      }),
    });

    if (!response.ok) {
      console.warn(`[structuredDataExtractor] Ollama returned ${response.status} for ${fileName}`);
      return undefined;
    }

    const data = await response.json();
    const raw: string = data.message?.content ?? data.response ?? '';
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as StructuredData;
    return parsed;
  } catch (err) {
    console.warn(`[structuredDataExtractor] Extraction failed for ${fileName}:`, err);
    return undefined;
  }
}

// ── Prompt formatter ──────────────────────────────────────────────────────────

/**
 * Format a StructuredData object as a concise human-readable block for the LLM prompt.
 * Returns an empty string if data is null/undefined.
 */
export function formatStructuredDataForPrompt(data: StructuredData | Record<string, unknown> | undefined): string {
  if (!data) return '';

  const d = data as Record<string, unknown>;
  if (d.doc_type !== 'payslip') {
    // Generic fallback: clean JSON
    return `Key figures:\n${JSON.stringify(d, null, 2)}`;
  }

  const lines: string[] = ['Key figures (extracted at index time):'];
  if (d.periode) lines.push(`  Période: ${d.periode}`);
  if (d.salaire_brut != null) lines.push(`  Salaire brut: ${d.salaire_brut} €`);
  if (d.net_avant_impot != null) lines.push(`  Net avant impôt sur le revenu: ${d.net_avant_impot} €`);
  if (d.impot_source != null) {
    const taux = d.taux_prelevement != null ? ` (${d.taux_prelevement}%)` : '';
    lines.push(`  Impôt sur le revenu (prélèvement à la source): ${d.impot_source} €${taux}`);
  }
  if (d.net_a_payer != null) lines.push(`  Net à payer: ${d.net_a_payer} €`);

  if (lines.length === 1) return ''; // nothing was populated
  return lines.join('\n');
}
