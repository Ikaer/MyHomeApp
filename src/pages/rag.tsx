import Head from 'next/head';
import { useState, useEffect } from 'react';
import { RagPageLayout, IngestPanel, ChatInterface, IngestPreview } from '@/components/rag';
import type { SourceOption } from '@/components/rag';
import { Tabs } from '@/components/shared';
import type { TabItem } from '@/components/shared/Tabs';

type RagTab = 'chat' | 'ingest-preview';

const TAB_ITEMS: TabItem<RagTab>[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'ingest-preview', label: 'Ingestion Preview' },
];

export default function RagPage() {
  const [activeTab, setActiveTab] = useState<RagTab>('chat');
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
      {activeTab === 'chat' ? (
        <RagPageLayout
          sidebar={<IngestPanel />}
          tabs={<Tabs items={TAB_ITEMS} active={activeTab} onChange={setActiveTab} />}
        >
          <ChatInterface sources={sources} />
        </RagPageLayout>
      ) : (
        <RagPageLayout
          tabs={<Tabs items={TAB_ITEMS} active={activeTab} onChange={setActiveTab} />}
        >
          <IngestPreview />
        </RagPageLayout>
      )}
    </>
  );
}
