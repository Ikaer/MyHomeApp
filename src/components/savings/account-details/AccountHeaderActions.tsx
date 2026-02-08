import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import styles from './AccountHeaderActions.module.css';

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
        <button className={sharedStyles.secondaryButton} onClick={onBack}>← Go to accounts</button>
        <div style={{ width: '2rem' }} />
        <button className={sharedStyles.button} onClick={onAddTransaction}>
          + Add Transaction
        </button>
        <button className={sharedStyles.secondaryButton} onClick={onRefreshPrices}>Refresh Prices</button>
        <button className={sharedStyles.secondaryButton} onClick={onCopyContext}>Copy Context</button>
        <button className={sharedStyles.secondaryButton} onClick={onShowCharts}>All Charts</button>
      </div>
      <h1 className={styles.title}>{title}</h1>
    </div>
  );
}
