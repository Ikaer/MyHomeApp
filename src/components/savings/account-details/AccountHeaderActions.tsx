import React from 'react';
import styles from '@/styles/savings.module.css';

interface AccountHeaderActionsProps {
  title: string;
  onBack: () => void;
  onAddTransaction: () => void;
  onRefreshPrices: () => void;
  onCopyContext: () => void;
  onShowCharts: () => void;
}

export default function AccountHeaderActions({
  title,
  onBack,
  onAddTransaction,
  onRefreshPrices,
  onCopyContext,
  onShowCharts
}: AccountHeaderActionsProps) {
  return (
    <div className={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className={styles.secondaryButton} onClick={onBack}>← Go to accounts</button>
        <div style={{ width: '2rem' }} />
        <button className={styles.button} onClick={onAddTransaction}>
          + Add Transaction
        </button>
        <button className={styles.secondaryButton} onClick={onRefreshPrices}>Refresh Prices</button>
        <button className={styles.secondaryButton} onClick={onCopyContext}>Copy Context</button>
        <button className={styles.secondaryButton} onClick={onShowCharts}>All Charts</button>
      </div>
      <h1 className={styles.title}>{title}</h1>
    </div>
  );
}
