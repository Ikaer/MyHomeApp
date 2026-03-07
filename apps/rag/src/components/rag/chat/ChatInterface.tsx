import { useState, useRef, useEffect } from 'react';
import styles from './ChatInterface.module.css';
import { Button } from '@myhomeapp/shared/components';
import SourceReferences from './SourceReferences';
import type { SourceReference, RagDebugInfo } from '@/models/rag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  statusText?: string; // transient status while streaming (e.g. "Embedding question…")
  debugInfo?: RagDebugInfo;
}

export interface SourceOption {
  label: string;
  collection: string;
  categories: string[];  // all available categories for this source
}

interface ChatInterfaceProps {
  sources: SourceOption[];
}

export default function ChatInterface({ sources }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [topK, setTopK] = useState<number>(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Default to first source collection once loaded
  useEffect(() => {
    if (sources.length > 0 && !selectedCollection) {
      setSelectedCollection(sources[0].collection);
    }
  }, [sources, selectedCollection]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  // Submit on Enter (Shift+Enter = newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitQuestion();
    }
  };

  const updateLastAssistant = (updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const msgs = [...prev];
      const lastIdx = msgs.length - 1;
      if (msgs[lastIdx]?.role === 'assistant') {
        msgs[lastIdx] = updater(msgs[lastIdx]);
      }
      return msgs;
    });
  };

  const submitQuestion = async () => {
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsStreaming(true);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', statusText: 'Connecting…' },
    ]);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          collection: selectedCollection,
          topK,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'status') {
              updateLastAssistant(msg => ({ ...msg, statusText: data.message }));
            } else if (data.type === 'token') {
              updateLastAssistant(msg => ({
                ...msg,
                content: msg.content + data.token,
                statusText: undefined,
              }));
            } else if (data.type === 'debug') {
              updateLastAssistant(msg => ({ ...msg, debugInfo: data.debugInfo }));
            } else if (data.type === 'done') {
              updateLastAssistant(msg => ({
                ...msg,
                // `answer` is only present on the no-results early-exit path
                content: data.answer ? data.answer : msg.content,
                sources: data.sources,
                statusText: undefined,
              }));
            } else if (data.type === 'error') {
              updateLastAssistant(msg => ({
                ...msg,
                content: `Error: ${data.error}`,
                statusText: undefined,
              }));
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch (e: any) {
      updateLastAssistant(msg => ({
        ...msg,
        content: `Error: ${e.message}`,
        statusText: undefined,
      }));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuestion();
  };

  const handleSourceChange = (collection: string) => {
    setSelectedCollection(collection);
  };

  const exportConversation = () => {
    const lines: string[] = [
      `=== RAG Conversation Export ===`,
      `Date: ${new Date().toLocaleString()}`,
      `Collection: ${selectedSource?.label ?? selectedCollection}`,
      `TopK: ${topK}`,
      ``,
    ];

    for (const msg of messages) {
      if (msg.role === 'user') {
        lines.push(`[User]`);
        lines.push(msg.content);
        lines.push(``);
      } else {
        lines.push(`[Assistant]`);
        lines.push(msg.content || '(no response)');
        lines.push(``);
        if (msg.sources && msg.sources.length > 0) {
          lines.push(`Sources (${msg.sources.length}):`);
          for (const src of msg.sources) {
            const score = `${(src.score * 100).toFixed(0)}%`;
            const page = src.pageNumber !== undefined ? `, page ${src.pageNumber}` : '';
            lines.push(`  - ${src.fileName} (score: ${score}${page}, source: ${src.sourceLabel})`);
            if (src.embeddedContext) {
              lines.push(`    Context: ${src.embeddedContext}`);
            }
          }
          lines.push(``);
        }
        if (msg.debugInfo) {
          const d = msg.debugInfo;
          const filterStr = d.queryFilter
            ? `{ doc_type: ${JSON.stringify(d.queryFilter.doc_type)}, year: ${d.queryFilter.year ?? 'null'}, month: ${d.queryFilter.month ?? 'null'} }`
            : 'none';
          const usedPct = d.contextBudgetChars > 0
            ? ` (${Math.round(d.totalContextChars / d.contextBudgetChars * 100)}% of budget)`
            : '';
          lines.push(`[Debug]`);
          lines.push(`  Model: ${d.model}`);
          lines.push(`  Query filter: ${filterStr}`);
          lines.push(`  HyDE doc: ${d.hydeDoc.slice(0, 200)}${d.hydeDoc.length > 200 ? '…' : ''}`);
          lines.push(`  Context: ${d.totalContextChars.toLocaleString()} / ${d.contextBudgetChars.toLocaleString()} chars${usedPct}`);
          lines.push(`  Docs: ${d.docsRetrieved} total (${d.docsFromParents} from parents, ${d.docsFromLegacy} legacy) — ${d.perDocBudgetChars.toLocaleString()} chars/doc budget`);
          lines.push(`  Per-document breakdown:`);
          for (const stat of d.docStats) {
            const truncInfo = stat.charsTruncated > 0 ? `, ${stat.charsTruncated.toLocaleString()} truncated` : '';
            const src = stat.fromParents ? '[parents]' : '[legacy]';
            lines.push(`    ${stat.fileName}: ${stat.charsUsed.toLocaleString()} chars used${truncInfo} ${src}`);
          }
          lines.push(``);
        }
        lines.push(`---`);
        lines.push(``);
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedSource = sources.find(s => s.collection === selectedCollection);

  return (
    <div className={styles.container}>
      {/* Source selector + topK control */}
      <div className={styles.toolbar}>
        {sources.length > 1 && (
          <>
            <span className={styles.toolbarLabel}>Source:</span>
            <div className={styles.sourceButtons}>
              {sources.map(s => (
                <button
                  key={s.collection}
                  type="button"
                  className={`${styles.sourceBtn} ${s.collection === selectedCollection ? styles.sourceBtnActive : ''}`}
                  onClick={() => handleSourceChange(s.collection)}
                  disabled={isStreaming}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
        <div className={styles.topKControl}>
          <span className={styles.toolbarLabel}>Top</span>
          <select
            className={styles.topKSelect}
            value={topK}
            onChange={e => setTopK(Number(e.target.value))}
            disabled={isStreaming}
          >
            {[5, 10, 20, 30, 50].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className={styles.exportBtn}
            onClick={exportConversation}
            disabled={isStreaming}
            title="Export conversation to .txt file"
          >
            Export
          </button>
        )}
      </div>

      {/* Message list */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p className={styles.emptyTitle}>
              {selectedSource ? `Ask about ${selectedSource.label}` : 'Ask a question'}
            </p>
            <p className={styles.emptyHint}>Press Enter to send · Shift+Enter for newline</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            <div className={styles.bubble}>
              {msg.statusText && (
                <span className={styles.statusText}>{msg.statusText}</span>
              )}
              {msg.content && (
                <span className={styles.content}>{msg.content}</span>
              )}
              {!msg.content && !msg.statusText && (
                <span className={styles.cursor}>▊</span>
              )}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <SourceReferences sources={msg.sources} />
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form className={styles.inputForm} onSubmit={handleFormSubmit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your documents…"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          disabled={isStreaming || !input.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          {isStreaming ? '…' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
