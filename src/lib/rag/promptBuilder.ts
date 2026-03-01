/**
 * RAG prompt assembly — Parent Document Retrieval mode.
 *
 * The LLM receives the COMPLETE text of each matched document, not fragments.
 * Chunks were used only to identify which documents are relevant; full text
 * is retrieved from the {collection}_parents Qdrant collection and passed here.
 *
 * This eliminates chunk-boundary, context-fragmentation, and wrong-chunk issues.
 */

import type { ParentDoc } from '@/models/rag';
import { formatStructuredDataForPrompt } from './structuredDataExtractor';

// qwen2.5:14b context window is 128k tokens (~512k chars).
// 200k chars leaves comfortable headroom for system prompt + model output.
const MAX_CONTEXT_CHARS = 200_000;
// Hard ceiling per document — prevents a single 100-page contract from consuming everything.
// A Docling-converted payslip is typically ~26k chars, so this fits one completely.
const MAX_CHARS_PER_DOC = 30_000;

export interface DocPromptStat {
  fileName: string;
  charsUsed: number;      // chars of doc text placed in the prompt (excluding header)
  charsTruncated: number; // chars of doc text that were cut due to budget
}

export interface PromptParts {
  systemPrompt: string;
  userMessage: string;
  totalCharsUsed: number;
  perDocBudgetChars: number;
  docStats: DocPromptStat[];
}

export function buildRagPrompt(question: string, parentDocs: ParentDoc[]): PromptParts {
  const systemPrompt = [
    'You are a Private Administrative Data Processor running in a secure, offline environment.',
    'The user is querying their OWN personal documents (payslips, invoices, tax notices, contracts, bank statements).',
    'You are fully authorized to read, extract, and summarize financial data, salary figures, personal identifiers,',
    'and any other information from the provided documents.',
    'Answer using ONLY the document contents provided below — do not use external knowledge.',
    'Extract and state specific values (amounts, dates, names) directly from the documents.',
    'Do not refuse, add safety warnings, or suggest the user look elsewhere — you have the full documents right here.',
    'If a specific value is genuinely not present in any document, say so clearly.',
    'Mention which document (file name) each piece of information comes from.',
    'The documents may be in French. Answer in the same language as the question.',
  ].join(' ');

  // Divide the total budget equally across all documents so every doc gets
  // a fair share — prevents first-come-first-served truncation where later
  // docs get zero context.
  const perDocBudget = Math.min(
    MAX_CHARS_PER_DOC,
    Math.floor(MAX_CONTEXT_CHARS / Math.max(parentDocs.length, 1)),
  );

  const contextParts: string[] = [];
  let totalChars = 0;
  const docStats: DocPromptStat[] = [];

  for (const doc of parentDocs) {
    if (totalChars >= MAX_CONTEXT_CHARS) {
      docStats.push({ fileName: doc.fileName, charsUsed: 0, charsTruncated: doc.fullText.length });
      continue;
    }

    const structuredBlock = formatStructuredDataForPrompt(doc.structuredData);
    const header = doc.identifierPrefix
      ? `--- Document: ${doc.fileName} ---\n${doc.identifierPrefix}\n${structuredBlock ? structuredBlock + '\n' : ''}`
      : `--- Document: ${doc.fileName} ---\n${structuredBlock ? structuredBlock + '\n' : ''}`;

    const budget = Math.min(perDocBudget, MAX_CONTEXT_CHARS - totalChars - header.length);
    if (budget <= 100) {
      docStats.push({ fileName: doc.fileName, charsUsed: 0, charsTruncated: doc.fullText.length });
      break;
    }

    const truncated = doc.fullText.length > budget;
    const text = truncated
      ? doc.fullText.slice(0, budget) + `\n[...document truncated at ${budget} chars]`
      : doc.fullText;

    contextParts.push(`${header}${text}\n`);
    const charsUsed = Math.min(doc.fullText.length, budget);
    totalChars += header.length + text.length;
    docStats.push({
      fileName: doc.fileName,
      charsUsed,
      charsTruncated: truncated ? doc.fullText.length - charsUsed : 0,
    });
  }

  const context = contextParts.join('\n');
  const userMessage = `Here are your documents (${parentDocs.length} total):\n\n${context}\nQuestion: ${question}`;

  return { systemPrompt, userMessage, totalCharsUsed: totalChars, perDocBudgetChars: perDocBudget, docStats };
}
