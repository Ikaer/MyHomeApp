import React from 'react';
import { Button } from '@/components/shared';
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
      <div className={styles.headerLayout}>
        <Button variant="secondary" onClick={onBack}>← Go to accounts</Button>
        <div className={styles.itemsSeparator} />
        <Button onClick={onAddTransaction}>
          + Add Transaction
        </Button>
        <Button variant="secondary" onClick={onRefreshPrices}>Refresh Prices</Button>
        <Button variant="secondary" onClick={onCopyContext}>Copy Context</Button>
        <Button variant="secondary" onClick={onShowCharts}>All Charts</Button>
      </div>
      <h1 className={styles.title}>{title}</h1>
    </div>
  );
}
