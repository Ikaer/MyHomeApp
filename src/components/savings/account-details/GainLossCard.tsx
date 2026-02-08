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
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { HistoryChartPoint } from './types';

interface GainLossCardProps {
  loading: boolean;
  data: HistoryChartPoint[];
}

export default function GainLossCard({ loading, data }: GainLossCardProps) {
  return (
    <div className={sharedStyles.accountCard} style={{ cursor: 'default' }}>
      <h2 className={sharedStyles.accountName}>Gain/Loss %</h2>
      {loading ? (
        <div className={sharedStyles.chartEmpty}>Loading history...</div>
      ) : data.length === 0 ? (
        <div className={sharedStyles.chartEmpty}>No historical data available.</div>
      ) : (
        <div className={sharedStyles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={value => `${Number(value).toFixed(2)}%`}
                width={70}
                domain={([dataMin, dataMax]) => {
                  const range = Math.max(dataMax - dataMin, 0.1);
                  return [dataMin - range * 0.1, dataMax + range * 0.1];
                }}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => `${Number(value ?? 0).toFixed(2)}%`}
              />
              <Line
                type="monotone"
                dataKey="gainLossPct"
                stroke="#34d399"
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
