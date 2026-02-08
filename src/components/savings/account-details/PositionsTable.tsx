import React from 'react';
import { Line, LineChart, YAxis } from 'recharts';
import styles from '@/styles/savings.module.css';
import { PositionsTableProps } from './types';

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
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'asset' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('asset')}
              >
                Asset
                <span className={styles.sortIndicator}>
                  {positionsSort.key === 'asset' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'quantity' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('quantity')}
              >
                Quantity
                <span className={styles.sortIndicator}>
                  {positionsSort.key === 'quantity' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'avgPrice' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('avgPrice')}
              >
                Avg. Price
                <span className={styles.sortIndicator}>
                  {positionsSort.key === 'avgPrice' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'currentPrice' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('currentPrice')}
              >
                Curr. Price
                <span className={styles.sortIndicator}>
                  {positionsSort.key === 'currentPrice' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th>Market Trend</th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'value' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('value')}
              >
                Value
                <span className={styles.sortIndicator}>
                  {positionsSort.key === 'value' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'gainLoss' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('gainLoss')}
              >
                Gain/Loss
                <span className={styles.sortIndicator}>
                  {positionsSort.key === 'gainLoss' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                </span>
              </button>
            </th>
            <th className={styles.sortableHeader}>
              <button
                className={`${styles.sortButton} ${positionsSort.key === 'gainLossPct' ? styles.sortActive : ''}`}
                onClick={() => onToggleSort('gainLossPct')}
              >
                Gain/Loss %
                <span className={styles.sortIndicator}>
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
                <span className={styles.ticker}>{pos.ticker}</span>
              </td>
              <td>{pos.quantity.toFixed(2)}</td>
              <td>{formatCurrency(pos.averagePurchasePrice)}</td>
              <td>{formatCurrency(pos.currentPrice)}</td>
              <td className={styles.sparklineCell}>
                {pos.isin && sparklineData[pos.isin]?.length ? (
                  <div className={styles.sparklineChart}>
                    <LineChart
                      width={140}
                      height={42}
                      data={sparklineData[pos.isin]}
                      margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                    >
                      <YAxis
                        hide
                        domain={([dataMin, dataMax]) => {
                          const range = Math.max(dataMax - dataMin, 0.01);
                          return [dataMin - range * 0.1, dataMax + range * 0.1];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#93c5fd"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </div>
                ) : (
                  <span className={styles.sparklineEmpty}>—</span>
                )}
              </td>
              <td>{formatCurrency(pos.currentValue)}</td>
              <td className={pos.unrealizedGainLoss >= 0 ? styles.positive : styles.negative}>
                {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGainLoss)}
              </td>
              <td className={pos.unrealizedGainLossPercentage >= 0 ? styles.positive : styles.negative}>
                {pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
              </td>
              <td>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenAssetCharts(pos.isin || null)}
                >
                  All charts
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
