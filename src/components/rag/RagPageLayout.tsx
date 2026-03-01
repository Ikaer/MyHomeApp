import React from 'react';
import styles from './RagPageLayout.module.css';

interface RagPageLayoutProps {
  sidebar?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
}

export default function RagPageLayout({ sidebar, tabs, children }: RagPageLayoutProps) {
  return (
    <div className={styles.layout}>
      {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
      <div className={styles.mainWrapper}>
        {tabs && <div className={styles.tabBar}>{tabs}</div>}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
