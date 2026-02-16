import React from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { Button } from '@/components/shared';
import styles from './PositionsTable.module.css';
import { PositionsTableProps } from './types';
import SparklineChart from './SparklineChart';
import { SortableHeaderButton } from '@/components/shared/table';

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
              <SortableHeaderButton
                label="Asset"
                isActive={positionsSort.key === 'asset'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('asset')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Quantity"
                isActive={positionsSort.key === 'quantity'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('quantity')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Avg. Price"
                isActive={positionsSort.key === 'avgPrice'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('avgPrice')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Curr. Price"
                isActive={positionsSort.key === 'currentPrice'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('currentPrice')}
              />
            </th>
            <th>Market Trend</th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Value"
                isActive={positionsSort.key === 'value'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('value')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Gain/Loss"
                isActive={positionsSort.key === 'gainLoss'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('gainLoss')}
              />
            </th>
            <th className={sharedStyles.sortableHeader}>
              <SortableHeaderButton
                label="Gain/Loss %"
                isActive={positionsSort.key === 'gainLossPct'}
                direction={positionsSort.direction}
                onClick={() => onToggleSort('gainLossPct')}
              />
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
