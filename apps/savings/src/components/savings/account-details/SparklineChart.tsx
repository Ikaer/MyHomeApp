import React, { useId, useMemo } from 'react';
import { Line, LineChart, Tooltip, YAxis } from 'recharts';
import styles from './PositionsTable.module.css';
import { AssetSparklinePoint } from './types';

interface SparklineChartProps {
  points: AssetSparklinePoint[];
  averagePurchasePrice: number;
  formatCurrency: (val: number) => string;
}

export default function SparklineChart({ points, averagePurchasePrice, formatCurrency }: SparklineChartProps) {
  const gradientId = useId();
  const { hasAverage, gradientOffset } = useMemo(() => {
    if (!points?.length) return { hasAverage: false, gradientOffset: 0.5 };

    const hasAvg = Number.isFinite(averagePurchasePrice) && averagePurchasePrice > 0;
    if (!hasAvg) return { hasAverage: false, gradientOffset: 0.5 };

    let min = points[0].value;
    let max = points[0].value;
    for (let i = 1; i < points.length; i += 1) {
      min = Math.min(min, points[i].value);
      max = Math.max(max, points[i].value);
    }

    const range = Math.max(max - min, 0.01);
    const offset = (max - averagePurchasePrice) / range;
    return { hasAverage: true, gradientOffset: Math.min(1, Math.max(0, offset)) };
  }, [averagePurchasePrice, points]);

  return (
    <div className={styles.sparklineChart}>
      <LineChart
        width={140}
        height={42}
        data={points}
        margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hasAverage ? '#10b981' : '#93c5fd'} />
            <stop offset={`${gradientOffset * 100}%`} stopColor={hasAverage ? '#10b981' : '#93c5fd'} />
            <stop offset={`${gradientOffset * 100}%`} stopColor={hasAverage ? '#ef4444' : '#93c5fd'} />
            <stop offset="100%" stopColor={hasAverage ? '#ef4444' : '#93c5fd'} />
          </linearGradient>
        </defs>
        <YAxis
          hide
          domain={([dataMin, dataMax]) => {
            const range = Math.max(dataMax - dataMin, 0.01);
            return [dataMin - range * 0.1, dataMax + range * 0.1];
          }}
        />
        <Tooltip
          cursor={false}
          isAnimationActive={false}
          formatter={(value) => [formatCurrency(Number(value)), '']}
          contentStyle={{
            background: 'rgba(17, 24, 39, 0.9)',
            border: '1px solid rgba(75, 85, 99, 0.6)',
            borderRadius: '0.5rem',
            color: '#e5e7eb',
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem'
          }}
          labelStyle={{ display: 'none' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={`url(#${gradientId})`}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
