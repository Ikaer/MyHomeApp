import { AssetPosition, Transaction } from '@/models/savings';

export interface HistoricalAccountRecord {
  timestamp: string;
  accountId: string;
  accountName: string;
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  xirr: number;
  currentYearXirr: number;
}

export interface HistoricalAssetRecord {
  timestamp: string;
  isin: string;
  ticker: string;
  name: string;
  quantity: number;
  averagePurchasePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number;
}

export interface HistoryChartPoint {
  date: string;
  totalInvested: number;
  currentValue: number;
  gainLossPct: number;
}

export interface HistoryMetricPoint {
  date: string;
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  xirr: number;
  currentYearXirr: number;
}

export interface AssetChartPoint {
  date: string;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number;
}

export interface AssetSparklinePoint {
  date: string;
  value: number;
}

export interface AnnualOverviewRow {
  year: number;
  endValue?: number;
  xirr?: number;
}

export interface AssetMetaInfo {
  name: string;
  isin: string;
  ticker: string;
}

export interface PositionsTableProps {
  positions: AssetPosition[];
  positionsSort: { key: PositionSortKey; direction: SortDirection };
  onToggleSort: (key: PositionSortKey) => void;
  sparklineData: Record<string, AssetSparklinePoint[]>;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onOpenAssetCharts: (isin: string | null) => void;
}

export interface TransactionsTableProps {
  transactions: Transaction[];
  transactionsSort: { key: TransactionSortKey; direction: SortDirection };
  onToggleSort: (key: TransactionSortKey) => void;
  formatCurrency: (val: number) => string;
}

export type SortDirection = 'asc' | 'desc';
export type PositionSortKey = 'asset' | 'quantity' | 'avgPrice' | 'currentPrice' | 'value' | 'gainLoss' | 'gainLossPct';
export type TransactionSortKey = 'date' | 'type' | 'asset' | 'ticker' | 'isin' | 'quantity' | 'price' | 'fees' | 'ttf' | 'total';

