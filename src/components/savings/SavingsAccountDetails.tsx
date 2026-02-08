import React, { useMemo, useState } from 'react';
import styles from '@/styles/savings.module.css';
import { SavingsAccount, Transaction } from '@/models/savings';
import TransactionForm from './account-details/TransactionForm';
import AccountHeaderActions from './account-details/AccountHeaderActions';
import PerformanceCard from './account-details/PerformanceCard';
import PortfolioValueCard from './account-details/PortfolioValueCard';
import GainLossCard from './account-details/GainLossCard';
import AnnualOverviewCard from './account-details/AnnualOverviewCard';
import PositionsTable from './account-details/PositionsTable';
import TransactionsTable from './account-details/TransactionsTable';
import AllChartsModal from './account-details/AllChartsModal';
import AssetChartsModal from './account-details/AssetChartsModal';
import AnnualEditorModal from './account-details/AnnualEditorModal';
import { buildClipboardText } from './account-details/helpers/clipboard';
import { buildAnnualXirr } from './account-details/helpers/xirr';
import { buildAnnualOverviewRows } from './account-details/helpers/annualOverview';
import { sortPositions, sortTransactions } from './account-details/helpers/sorting';
import {
  AnnualOverviewRow,
  AssetChartPoint,
  AssetMetaInfo,
  AssetSparklinePoint,
  HistoryChartPoint,
  HistoryMetricPoint,
  PositionSortKey,
  SortDirection,
  TransactionSortKey
} from './account-details/types';
import { useSavingsAccountData } from '@/hooks/savings/useSavingsAccountData';
import { useAccountHistory } from '@/hooks/savings/useAccountHistory';
import { useAssetHistory } from '@/hooks/savings/useAssetHistory';
import { useAnnualValueEditor } from '@/hooks/savings/useAnnualValueEditor';
import { useTransactionEditor } from '@/hooks/savings/useTransactionEditor';
import {
  getActiveAssetInfo,
  mapAssetChartData,
  mapAssetSparklineData,
  mapHistoryChartData,
  mapHistoryMetrics
} from './account-details/helpers/mappers';

interface SavingsAccountDetailsProps {
  account: SavingsAccount;
  onBack: () => void;
}

export default function SavingsAccountDetails({ account, onBack }: SavingsAccountDetailsProps) {
  const {
    data,
    transactions,
    annualValues,
    setAnnualValues,
    loading,
    refreshData
  } = useSavingsAccountData(account.id);
  const { history, loading: historyLoading } = useAccountHistory(account.id);
  const isins = useMemo(() => data?.positions?.map(pos => pos.isin).filter(Boolean) || [], [data?.positions]);
  const { assetHistory } = useAssetHistory(isins);

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [showCharts, setShowCharts] = useState(false);
  const [showAssetCharts, setShowAssetCharts] = useState(false);
  const [activeAssetIsin, setActiveAssetIsin] = useState<string | null>(null);
  const [positionsSort, setPositionsSort] = useState<{ key: PositionSortKey; direction: SortDirection }>(
    { key: 'asset', direction: 'asc' }
  );
  const [transactionsSort, setTransactionsSort] = useState<{ key: TransactionSortKey; direction: SortDirection }>(
    { key: 'date', direction: 'desc' }
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(val);
  };

  const formatPercent = (val: number) => {
    return (val * 1).toFixed(2) + '%';
  };

  const {
    isOpen: isTransactionEditorOpen,
    mode: transactionEditorMode,
    editingTransaction,
    openAddTransaction,
    openEditTransaction,
    closeTransactionEditor,
    saveTransaction
  } = useTransactionEditor({ accountId: account.id, onRefresh: refreshData });

  const handleCopyContext = async () => {
    if (!data) return;
    const text = buildClipboardText({
      account,
      data,
      annualOverviewRows,
      transactions,
      formatCurrency,
      formatPercent
    });
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const annualXirr = useMemo(() => {
    return buildAnnualXirr({
      transactions,
      annualValues,
      currentValue: data?.summary.currentValue
    });
  }, [transactions, annualValues, data?.summary.currentValue]);

  const annualOverviewRows: AnnualOverviewRow[] = useMemo(() => {
    return buildAnnualOverviewRows({
      transactions,
      annualValues,
      annualXirr,
      currentValue: data?.summary.currentValue
    });
  }, [transactions, annualValues, annualXirr, data?.summary.currentValue]);

  const historyChartData: HistoryChartPoint[] = useMemo(() => {
    return mapHistoryChartData(history);
  }, [history]);

  const historyMetrics: HistoryMetricPoint[] = useMemo(() => {
    return mapHistoryMetrics(history);
  }, [history]);

  const assetSparklineData: Record<string, AssetSparklinePoint[]> = useMemo(() => {
    return mapAssetSparklineData(assetHistory);
  }, [assetHistory]);

  const assetChartData: Record<string, AssetChartPoint[]> = useMemo(() => {
    return mapAssetChartData(assetHistory);
  }, [assetHistory]);

  const activeAssetInfo: AssetMetaInfo | null = useMemo(() => {
    return getActiveAssetInfo(activeAssetIsin, data?.positions);
  }, [activeAssetIsin, data?.positions]);

  const {
    editingYear,
    editingEndValue,
    setEditingEndValue,
    openAnnualEditor,
    closeAnnualEditor,
    saveAnnualValue
  } = useAnnualValueEditor({
    accountId: account.id,
    setAnnualValues
  });

  const toggleSort = <TKey extends string>(
    current: { key: TKey; direction: SortDirection },
    key: TKey
  ): { key: TKey; direction: SortDirection } => {
    if (current.key === key) {
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    }
    return { key, direction: 'asc' };
  };

  const positionsSorted = useMemo(() => {
    if (!data) return [];
    return sortPositions(data.positions, positionsSort);
  }, [data, positionsSort]);

  const transactionsSorted = useMemo(() => {
    return sortTransactions(transactions, transactionsSort);
  }, [transactions, transactionsSort]);

  if (loading) return <div className={styles.emptyState}>Loading account details...</div>;
  if (!data) return <div className={styles.emptyState}>Error loading data</div>;

  const { summary } = data;

  return (
    <div>
      <TransactionForm
        open={isTransactionEditorOpen}
        mode={transactionEditorMode}
        initialTransaction={editingTransaction}
        onSave={saveTransaction}
        onClose={closeTransactionEditor}
      />

      <AnnualEditorModal
        open={editingYear !== null}
        year={editingYear}
        endValue={editingEndValue}
        currency={account.currency}
        onChangeEndValue={setEditingEndValue}
        onClose={closeAnnualEditor}
        onSave={saveAnnualValue}
      />

      <AllChartsModal
        open={showCharts}
        loading={historyLoading}
        metrics={historyMetrics}
        onClose={() => setShowCharts(false)}
        formatCurrency={formatCurrency}
      />

      <AssetChartsModal
        open={showAssetCharts}
        activeIsin={activeAssetIsin}
        activeAssetInfo={activeAssetInfo}
        assetChartData={assetChartData}
        onClose={() => setShowAssetCharts(false)}
        formatCurrency={formatCurrency}
      />

      <AccountHeaderActions
        title={account.name}
        onBack={onBack}
        onAddTransaction={openAddTransaction}
        onRefreshPrices={refreshData}
        onCopyContext={handleCopyContext}
        onShowCharts={() => setShowCharts(true)}
      />

      <div className={styles.accountGrid}>
        <PerformanceCard
          summary={summary}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
        />
        <PortfolioValueCard
          loading={historyLoading}
          data={historyChartData}
          formatCurrency={formatCurrency}
        />
        <GainLossCard
          loading={historyLoading}
          data={historyChartData}
        />
        <AnnualOverviewCard
          rows={annualOverviewRows}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          onEdit={openAnnualEditor}
        />
      </div>

      <div className={styles.header} style={{ borderBottom: '1px solid rgba(75, 85, 99, 0.3)', paddingBottom: '0.5rem' }}>
        <div className="tab-bar">
          <button
            className={`tab-button ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            Positions
          </button>
          <button
            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
        </div>
      </div>

      {activeTab === 'positions' ? (
        <PositionsTable
          positions={positionsSorted}
          positionsSort={positionsSort}
          onToggleSort={(key) => setPositionsSort(toggleSort(positionsSort, key))}
          sparklineData={assetSparklineData}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          onOpenAssetCharts={(isin) => {
            setActiveAssetIsin(isin);
            setShowAssetCharts(true);
          }}
        />
      ) : (
        <TransactionsTable
          transactions={transactionsSorted}
          transactionsSort={transactionsSort}
          onToggleSort={(key) => setTransactionsSort(toggleSort(transactionsSort, key))}
          formatCurrency={formatCurrency}
          onEditTransaction={openEditTransaction}
        />
      )}
    </div>
  );
}
