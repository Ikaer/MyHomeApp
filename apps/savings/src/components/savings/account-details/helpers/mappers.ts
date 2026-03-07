import { AssetPosition } from '@/models/savings';
import {
  AssetChartPoint,
  AssetMetaInfo,
  AssetSparklinePoint,
  HistoryChartPoint,
  HistoryMetricPoint,
  HistoricalAssetRecord,
  HistoricalAccountRecord
} from '../types';

export function mapHistoryChartData(history: HistoricalAccountRecord[]): HistoryChartPoint[] {
  return history.map(entry => {
    const gainLossPct = entry.totalInvested > 0
      ? (entry.totalGainLoss / entry.totalInvested) * 100
      : 0;
    return {
      date: entry.timestamp.slice(0, 10),
      totalInvested: entry.totalInvested,
      currentValue: entry.currentValue,
      gainLossPct
    };
  });
}

export function mapHistoryMetrics(history: HistoricalAccountRecord[]): HistoryMetricPoint[] {
  return history.map(entry => ({
    date: entry.timestamp.slice(0, 10),
    totalInvested: entry.totalInvested,
    currentValue: entry.currentValue,
    totalGainLoss: entry.totalGainLoss,
    xirr: entry.xirr,
    currentYearXirr: entry.currentYearXirr
  }));
}

export function mapAssetSparklineData(
  assetHistory: Record<string, HistoricalAssetRecord[]>
): Record<string, AssetSparklinePoint[]> {
  const map: Record<string, AssetSparklinePoint[]> = {};
  Object.entries(assetHistory).forEach(([isin, entries]) => {
    map[isin] = entries.map(entry => ({
      date: entry.timestamp.slice(0, 10),
      value: entry.currentPrice
    }));
  });
  return map;
}

export function mapAssetChartData(
  assetHistory: Record<string, HistoricalAssetRecord[]>
): Record<string, AssetChartPoint[]> {
  const map: Record<string, AssetChartPoint[]> = {};
  Object.entries(assetHistory).forEach(([isin, entries]) => {
    map[isin] = entries.map(entry => ({
      date: entry.timestamp.slice(0, 10),
      currentPrice: entry.currentPrice,
      currentValue: entry.currentValue,
      unrealizedGainLoss: entry.unrealizedGainLoss,
      unrealizedGainLossPercentage: entry.unrealizedGainLossPercentage
    }));
  });
  return map;
}

export function getActiveAssetInfo(
  activeAssetIsin: string | null,
  positions?: AssetPosition[]
): AssetMetaInfo | null {
  if (!activeAssetIsin || !positions) return null;
  const match = positions.find(pos => pos.isin === activeAssetIsin);
  return match ? { name: match.name, isin: match.isin, ticker: match.ticker } : null;
}

