import React from 'react';
import styles from '@/styles/savings.module.css';
import { AnnualOverviewRow } from './types';

interface AnnualOverviewCardProps {
  rows: AnnualOverviewRow[];
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onEdit: (year: number, endValue?: number) => void;
}

export default function AnnualOverviewCard({ rows, formatCurrency, formatPercent, onEdit }: AnnualOverviewCardProps) {
  return (
    <div className={styles.accountCard} style={{ cursor: 'default' }}>
      <h2 className={styles.accountName}>Annual Overview</h2>
      {rows.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: '1.5rem 0' }}>
          No annual data available.
        </div>
      ) : (
        <div className={styles.tableContainer} style={{ marginTop: '1rem' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Year</th>
                <th>End Value</th>
                <th>XIRR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(entry => (
                <tr key={entry.year}>
                  <td>{entry.year}</td>
                  <td>{entry.endValue === undefined ? '—' : formatCurrency(entry.endValue)}</td>
                  <td className={entry.xirr === undefined ? '' : (entry.xirr >= 0 ? styles.positive : styles.negative)}>
                    {entry.xirr === undefined ? '—' : `${entry.xirr >= 0 ? '+' : ''}${formatPercent(entry.xirr * 100)}`}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => onEdit(entry.year, entry.endValue)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
