import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import styles from '@/styles/savings.module.css';
import { HistoryChartPoint } from './types';

interface PortfolioValueCardProps {
  loading: boolean;
  data: HistoryChartPoint[];
  formatCurrency: (val: number) => string;
}

export default function PortfolioValueCard({ loading, data, formatCurrency }: PortfolioValueCardProps) {
  return (
    <div className={styles.accountCard} style={{ cursor: 'default' }}>
      <h2 className={styles.accountName}>Portfolio Value</h2>
      {loading ? (
        <div className={styles.chartEmpty}>Loading history...</div>
      ) : data.length === 0 ? (
        <div className={styles.chartEmpty}>No historical data available.</div>
      ) : (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={value => formatCurrency(Number(value))}
                width={90}
                domain={([dataMin, dataMax]) => {
                  const range = Math.max(dataMax - dataMin, 1);
                  return [dataMin - range * 0.05, dataMax + range * 0.05];
                }}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
              <Line
                type="monotone"
                dataKey="totalInvested"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="currentValue"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
