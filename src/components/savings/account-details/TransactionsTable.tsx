import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { Button } from '@/components/shared';
import { TransactionsTableProps } from './types';

export default function TransactionsTable({
  transactions,
  transactionsSort,
  onToggleSort,
  formatCurrency,
  onEditTransaction
}: TransactionsTableProps) {
  return (
    <div className={sharedStyles.tableContainer}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'date' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('date')}
              >
                Date
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'date' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'type' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('type')}
              >
                Type
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'type' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'asset' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('asset')}
              >
                Asset
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'asset' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'ticker' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('ticker')}
              >
                Ticker
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'ticker' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'isin' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('isin')}
              >
                ISIN
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'isin' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'quantity' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('quantity')}
              >
                Quantity
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'quantity' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'price' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('price')}
              >
                Price
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'price' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'fees' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('fees')}
              >
                Fees
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'fees' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'ttf' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('ttf')}
              >
                TTF
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'ttf' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${transactionsSort.key === 'total' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('total')}
              >
                Total
                <span className={sharedStyles.sortIndicator}>
                  {transactionsSort.key === 'total' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <td>{t.date}</td>
              <td style={{ color: t.type === 'Buy' ? '#60a5fa' : '#ef4444' }}>{t.type}</td>
              <td>{t.assetName}</td>
              <td>{t.ticker}</td>
              <td>{t.isin}</td>
              <td>{t.quantity}</td>
              <td>{formatCurrency(t.unitPrice)}</td>
              <td>{formatCurrency(t.fees)}</td>
              <td>{formatCurrency(t.ttf)}</td>
              <td>{formatCurrency(t.totalAmount)}</td>
              <td>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEditTransaction(t)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
