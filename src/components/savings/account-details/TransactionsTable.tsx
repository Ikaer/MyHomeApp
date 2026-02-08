import React from 'react';
import styles from '@/styles/savings.module.css';
import { TransactionsTableProps } from './types';

export default function TransactionsTable({
  transactions,
  transactionsSort,
  onToggleSort,
  formatCurrency
}: TransactionsTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'date' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('date')}
              >
                Date
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'date' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'type' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('type')}
              >
                Type
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'type' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'asset' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('asset')}
              >
                Asset
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'asset' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'ticker' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('ticker')}
              >
                Ticker
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'ticker' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'isin' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('isin')}
              >
                ISIN
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'isin' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'quantity' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('quantity')}
              >
                Quantity
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'quantity' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'price' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('price')}
              >
                Price
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'price' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'fees' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('fees')}
              >
                Fees
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'fees' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'ttf' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('ttf')}
              >
                TTF
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'ttf' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${transactionsSort.key === 'total' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('total')}
              >
                Total
                <span className={styles.sortIndicator}>
                  {transactionsSort.key === 'total' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
