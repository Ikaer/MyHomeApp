import Head from 'next/head';
import { useState, useEffect } from 'react';
import { RagPageLayout, IngestPanel, ChatInterface } from '@/components/rag';
import type { SourceOption } from '@/components/rag';

export default function RagPage() {
  const [sources, setSources] = useState<SourceOption[]>([]);

  useEffect(() => {
    fetch('/api/rag/ingest')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.sources)) {
          setSources(
            data.sources.map((s: { label: string; collection: string; categories: string[] }) => ({
              label: s.label,
              collection: s.collection,
              categories: s.categories ?? [],
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

  return (
    <>
      <Head>
        <title>RAG — MyHomeApp</title>
      </Head>
      <RagPageLayout sidebar={<IngestPanel />}>
        <ChatInterface sources={sources} />
      </RagPageLayout>
    </>
  );
}
