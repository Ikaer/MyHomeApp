import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { Button } from '@/components/shared';
import { SortableHeaderButton } from '@/components/shared/table';
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
              <SortableHeaderButton
                label="Date"
                isActive={transactionsSort.key === 'date'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('date')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Type"
                isActive={transactionsSort.key === 'type'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('type')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Asset"
                isActive={transactionsSort.key === 'asset'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('asset')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Ticker"
                isActive={transactionsSort.key === 'ticker'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('ticker')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="ISIN"
                isActive={transactionsSort.key === 'isin'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('isin')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Quantity"
                isActive={transactionsSort.key === 'quantity'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('quantity')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Price"
                isActive={transactionsSort.key === 'price'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('price')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Fees"
                isActive={transactionsSort.key === 'fees'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('fees')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="TTF"
                isActive={transactionsSort.key === 'ttf'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('ttf')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Total"
                isActive={transactionsSort.key === 'total'}
                direction={transactionsSort.direction}
                onClick={() => onToggleSort('total')}
              />
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
