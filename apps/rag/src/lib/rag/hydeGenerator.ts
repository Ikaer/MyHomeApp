/**
 * HyDE — Hypothetical Document Embeddings.
 *
 * Problem: When a user asks a question, the question embedding lives in "question space"
 * while indexed document chunks live in "document space".  For structured documents like
 * payslips, an exact-answer query ("salaire brut 4 900 €, période 01/02/21 au 28/02/21")
 * will score vastly higher than the original question
 * ("peut tu me donner mon salaire pour chaque mois en 2021?").
 *
 * HyDE fixes this by asking the LLM to hallucinate a short document excerpt that *would*
 * answer the question, then embedding that instead of the question text.
 * The hypothetical answer naturally uses the same vocabulary as real documents.
 *
 * Reference: Gao et al. 2022 — "Precise Zero-Shot Dense Retrieval without Relevance Labels"
 * https://arxiv.org/abs/2212.10496
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.19:11434';
const LLM_MODEL = 'llama3.1:8b';

const HYDE_SYSTEM_PROMPT = [
  'You are a document retrieval assistant.',
  'The user will ask a question about their personal documents (payslips, invoices, contracts, account statements, etc.).',
  'Your task: write a SHORT excerpt (50–120 words) that looks like it was extracted from the real document that would answer this question.',
  'Use vocabulary, labels and formats typical of that document type.',
  'For payslips: include fields like "Salaire brut", "Net à payer", "Période", month names, amounts in euros.',
  'For invoices: include amounts, dates, vendor names.',
  'Do NOT include any preamble like "Voici un extrait" or "Based on your question".',
  'Write ONLY the hypothetical document fragment — nothing else.',
  'The documents are usually in French.',
].join('\n');

/**
 * Generate a hypothetical document excerpt that would answer `question`.
 * This is embedded instead of the raw question to bridge the query↔document vocabulary gap.
 * On failure, returns the original question as a safe fallback (degraded to standard RAG).
 */
export async function generateHypotheticalDocument(question: string): Promise<string> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: HYDE_SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: 150 },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hypothetical: string = (data.message?.content ?? data.response ?? '').trim();

    if (!hypothetical || hypothetical.length < 20) {
      throw new Error('Response too short or empty');
    }

    console.log(`[HyDE] Generated hypothetical (${hypothetical.length} chars): ${hypothetical.slice(0, 120)}…`);
    return hypothetical;
  } catch (err) {
    console.warn('[HyDE] Generation failed, falling back to raw question:', err);
    return question; // safe fallback: standard RAG behaviour
  }
}
