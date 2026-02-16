import React from 'react';
import { Card } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { AnnualOverviewRow } from './types';

interface AnnualOverviewCardProps {
  rows: AnnualOverviewRow[];
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onEdit: (year: number, endValue?: number) => void;
}

export default function AnnualOverviewCard({ rows, formatCurrency, formatPercent, onEdit }: AnnualOverviewCardProps) {
  return (
    <Card>
      <h2 className={sharedStyles.accountName}>Annual Overview</h2>
      {rows.length === 0 ? (
        <div className={sharedStyles.emptyState} style={{ padding: '1.5rem 0' }}>
          No annual data available.
        </div>
      ) : (
        <div className={sharedStyles.tableContainer} style={{ marginTop: '1rem' }}>
          <table className={sharedStyles.table}>
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
                  <td className={entry.xirr === undefined ? '' : (entry.xirr >= 0 ? sharedStyles.positive : sharedStyles.negative)}>
                    {entry.xirr === undefined ? '—' : `${entry.xirr >= 0 ? '+' : ''}${formatPercent(entry.xirr * 100)}`}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
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
    </Card>
  );
}
