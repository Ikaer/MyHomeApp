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
import styles from './AssetChartsModal.module.css';
import { AssetChartPoint, AssetMetaInfo } from './types';

interface AssetChartsModalProps {
  open: boolean;
  activeIsin: string | null;
  activeAssetInfo: AssetMetaInfo | null;
  assetChartData: Record<string, AssetChartPoint[]>;
  onClose: () => void;
  formatCurrency: (val: number) => string;
}

export default function AssetChartsModal({
  open,
  activeIsin,
  activeAssetInfo,
  assetChartData,
  onClose,
  formatCurrency
}: AssetChartsModalProps) {
  return (
    <Modal
      open={open}
      title="Asset Charts"
      onClose={onClose}
      size="lg"
      headerContent={
        activeAssetInfo ? (
          <div className={styles.assetMeta}>
            <span>{activeAssetInfo.name}</span>
            <span className={styles.assetMetaDivider}>•</span>
            <span>{activeAssetInfo.isin}</span>
            <span className={styles.assetMetaDivider}>•</span>
            <span>{activeAssetInfo.ticker}</span>
          </div>
        ) : null
      }
    >
      {!activeIsin ? (
        <div className={sharedStyles.chartEmpty}>No asset selected.</div>
      ) : assetChartData[activeIsin]?.length ? (
        <div className={sharedStyles.chartsGrid}>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>Market Price</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assetChartData[activeIsin]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={value => formatCurrency(Number(value))}
                      width={90}
                      domain={([dataMin, dataMax]) => {
                        const range = Math.max(dataMax - dataMin, 0.01);
                        return [dataMin - range * 0.1, dataMax + range * 0.1];
                      }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                    <Line
                      type="monotone"
                      dataKey="currentPrice"
                      stroke="#93c5fd"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={sharedStyles.chartPanel}>
              <div className={sharedStyles.chartPanelTitle}>Market Value</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assetChartData[activeIsin]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
              <div className={sharedStyles.chartPanelTitle}>Unrealized Gain/Loss</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assetChartData[activeIsin]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(75, 85, 99, 0.25)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={value => formatCurrency(Number(value))}
                      width={90}
                      domain={([dataMin, dataMax]) => {
                        const range = Math.max(dataMax - dataMin, 1);
                        return [dataMin - range * 0.1, dataMax + range * 0.1];
                      }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                    <Line
                      type="monotone"
                      dataKey="unrealizedGainLoss"
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
              <div className={sharedStyles.chartPanelTitle}>Gain/Loss %</div>
              <div className={sharedStyles.chartPanelBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assetChartData[activeIsin]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                      dataKey="unrealizedGainLossPercentage"
                      stroke="#f472b6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
        </div>
      ) : (
        <div className={sharedStyles.chartEmpty}>No historical data available.</div>
      )}
    </Modal>
  );
}
