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
import { Modal } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { HistoryMetricPoint } from './types';

interface AllChartsModalProps {
  open: boolean;
  loading: boolean;
  metrics: HistoryMetricPoint[];
  onClose: () => void;
  formatCurrency: (val: number) => string;
}

export default function AllChartsModal({
  open,
  loading,
  metrics,
  onClose,
  formatCurrency
}: AllChartsModalProps) {
  return (
    <Modal open={open} title="All Charts" onClose={onClose} size="lg">
      {loading ? (
        <div className={sharedStyles.chartEmpty}>Loading history...</div>
      ) : metrics.length === 0 ? (
        <div className={sharedStyles.chartEmpty}>No historical data available.</div>
      ) : (
        <div className={sharedStyles.chartsGrid}>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>Total Invested</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>Current Value</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                      dataKey="currentValue"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>Total Gain/Loss</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                      dataKey="totalGainLoss"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>XIRR</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={value => `${(Number(value) * 100).toFixed(2)}%`}
                      width={70}
                      domain={([dataMin, dataMax]) => {
                        const range = Math.max(dataMax - dataMin, 0.001);
                        return [dataMin - range * 0.1, dataMax + range * 0.1];
                      }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => `${(Number(value ?? 0) * 100).toFixed(2)}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="xirr"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>Current Year XIRR</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={value => `${(Number(value) * 100).toFixed(2)}%`}
                      width={70}
                      domain={([dataMin, dataMax]) => {
                        const range = Math.max(dataMax - dataMin, 0.001);
                        return [dataMin - range * 0.1, dataMax + range * 0.1];
                      }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => `${(Number(value ?? 0) * 100).toFixed(2)}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="currentYearXirr"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
        </div>
      )}
    </Modal>
  );
}
