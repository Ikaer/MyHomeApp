import React from 'react';
import { Card } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { AccountSummary } from '@/models/savings';

interface PerformanceCardProps {
  summary: AccountSummary;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
}

export default function PerformanceCard({ summary, formatCurrency, formatPercent }: PerformanceCardProps) {
  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Performance</h2>
      <div className={sharedStyles.statsGrid} style={{ marginTop: '1rem' }}>
        <div className={sharedStyles.statItem}>
          <span className={sharedStyles.statLabel}>Current Value</span>
          <span className={sharedStyles.statValue} style={{ fontSize: '2rem' }}>{formatCurrency(summary.currentValue)}</span>
        </div>
        <div className={sharedStyles.statItem}>
          <span className={sharedStyles.statLabel}>Total Gain/Loss</span>
          <span className={`${sharedStyles.statValue} ${summary.totalGainLoss >= 0 ? sharedStyles.positive : sharedStyles.negative}`} style={{ fontSize: '1.5rem' }}>
            {summary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
          </span>
        </div>
        <div className={sharedStyles.statItem}>
          <span className={sharedStyles.statLabel}>XIRR (Annualized)</span>
          <span className={`${sharedStyles.statValue} ${summary.xirr >= 0 ? sharedStyles.positive : sharedStyles.negative}`}>
            {formatPercent(summary.xirr * 100)}
          </span>
        </div>
      </div>
    </Card>
  );
}
