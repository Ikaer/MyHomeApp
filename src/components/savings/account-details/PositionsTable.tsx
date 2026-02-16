import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { Button } from '@/components/shared';
import styles from './PositionsTable.module.css';
import { PositionsTableProps } from './types';
import SparklineChart from './SparklineChart';

export default function PositionsTable({
  positions,
  positionsSort,
  onToggleSort,
  sparklineData,
  formatCurrency,
  formatPercent,
  onOpenAssetCharts
}: PositionsTableProps) {
  return (
    <div className={sharedStyles.tableContainer}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'asset' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('asset')}
              >
                Asset
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'asset' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'quantity' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('quantity')}
              >
                Quantity
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'quantity' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'avgPrice' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('avgPrice')}
              >
                Avg. Price
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'avgPrice' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'currentPrice' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('currentPrice')}
              >
                Curr. Price
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'currentPrice' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th>Market Trend</th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'value' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('value')}
              >
                Value
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'value' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'gainLoss' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('gainLoss')}
              >
                Gain/Loss
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'gainLoss' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={sharedStyles.sortableHeader}>
              <button
                className={`${sharedStyles.sortButton} ${positionsSort.key === 'gainLossPct' ? sharedStyles.sortActive : ''}`}
                onClick={() => onToggleSort('gainLossPct')}
              >
                Gain/Loss %
                <span className={sharedStyles.sortIndicator}>
                  {positionsSort.key === 'gainLossPct' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th>Charts</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => (
            <tr key={pos.ticker}>
              <td>
                <strong>{pos.name}</strong>
                <br />
                <span className={sharedStyles.ticker}>{pos.ticker}</span>
              </td>
              <td>{pos.quantity.toFixed(2)}</td>
              <td>{formatCurrency(pos.averagePurchasePrice)}</td>
              <td>{formatCurrency(pos.currentPrice)}</td>
              <td className={styles.sparklineCell}>
                {pos.isin && sparklineData[pos.isin]?.length ? (
                  <SparklineChart
                    points={sparklineData[pos.isin]}
                    averagePurchasePrice={pos.averagePurchasePrice}
                    formatCurrency={formatCurrency}
                  />
                ) : (
                  <span className={styles.sparklineEmpty}>—</span>
                )}
              </td>
              <td>{formatCurrency(pos.currentValue)}</td>
              <td className={pos.unrealizedGainLoss >= 0 ? sharedStyles.positive : sharedStyles.negative}>
                {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGainLoss)}
              </td>
              <td className={pos.unrealizedGainLossPercentage >= 0 ? sharedStyles.positive : sharedStyles.negative}>
                {pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
              </td>
              <td>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAssetCharts(pos.isin || null)}
                >
                  All charts
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
