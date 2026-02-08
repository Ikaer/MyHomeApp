import React from 'react';
import styles from '@/styles/savings.module.css';
import { AccountSummary } from '@/models/savings';

interface PerformanceCardProps {
  summary: AccountSummary;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export default function PerformanceCard({ summary, formatCurrency, formatPercent }: PerformanceCardProps) {
  return (
    <div className={styles.accountCard} style={{ cursor: 'default' }}>
      <h2 className={styles.accountName}>Performance</h2>
      <div className={styles.statsGrid} style={{ marginTop: '1rem' }}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Current Value</span>
          <span className={styles.statValue} style={{ fontSize: '2rem' }}>{formatCurrency(summary.currentValue)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Gain/Loss</span>
          <span className={`${styles.statValue} ${summary.totalGainLoss >= 0 ? styles.positive : styles.negative}`} style={{ fontSize: '1.5rem' }}>
            {summary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>XIRR (Annualized)</span>
          <span className={`${styles.statValue} ${summary.xirr >= 0 ? styles.positive : styles.negative}`}>
            {formatPercent(summary.xirr * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}
