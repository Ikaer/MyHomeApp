import React from 'react';
import styles from './RagPageLayout.module.css';

interface RagPageLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function RagPageLayout({ sidebar, children }: RagPageLayoutProps) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>{sidebar}</aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
