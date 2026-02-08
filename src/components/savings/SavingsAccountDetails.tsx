import React, { useMemo, useState } from 'react';
import xirr from 'xirr';
import styles from '@/styles/savings.module.css';
import { SavingsAccount, Transaction } from '@/models/savings';
import TransactionForm from './TransactionForm';
import AccountHeaderActions from './account-details/AccountHeaderActions';
import PerformanceCard from './account-details/PerformanceCard';
import PortfolioValueCard from './account-details/PortfolioValueCard';
import GainLossCard from './account-details/GainLossCard';
import AnnualOverviewCard from './account-details/AnnualOverviewCard';
import PositionsTable from './account-details/PositionsTable';
import TransactionsTable from './account-details/TransactionsTable';
import AllChartsModal from './account-details/AllChartsModal';
import AssetChartsModal from './account-details/AssetChartsModal';
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
  const [showForm, setShowForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showAssetCharts, setShowAssetCharts] = useState(false);
  const [activeAssetIsin, setActiveAssetIsin] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editingEndValue, setEditingEndValue] = useState<string>('');
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

  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      const res = await fetch(`/api/savings/transactions/${account.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });

      if (res.ok) {
        setShowForm(false);
        refreshData();
      } else {
        const err = await res.json();
        alert(`Failed to save transaction: ${err.error}`);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('An error occurred while saving the transaction.');
    }
  };

  const buildClipboardText = () => {
    if (!data) return '';

    const lines: string[] = [];
    lines.push(`Savings Account: ${account.name} (${account.type})`);
    lines.push(`Currency: ${account.currency}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`- Current Value: ${formatCurrency(data.summary.currentValue)}`);
    lines.push(`- Total Invested: ${formatCurrency(data.summary.totalInvested)}`);
    lines.push(`- Total Gain/Loss: ${data.summary.totalGainLoss >= 0 ? '+' : ''}${formatCurrency(data.summary.totalGainLoss)}`);
    lines.push(`- XIRR (Annualized): ${data.summary.xirr >= 0 ? '+' : ''}${formatPercent(data.summary.xirr * 100)}`);
    lines.push('');
    lines.push('Annual Overview');
    if (annualOverviewRows.length === 0) {
      lines.push('- No annual data');
    } else {
      annualOverviewRows.forEach(entry => {
        const endValue = entry.endValue === undefined ? '—' : formatCurrency(entry.endValue);
        const xirrValue = entry.xirr === undefined ? '—' : `${entry.xirr >= 0 ? '+' : ''}${formatPercent(entry.xirr * 100)}`;
        lines.push(`- ${entry.year}: End Value ${endValue}, XIRR ${xirrValue}`);
      });
    }
    lines.push('');
    lines.push('Positions');
    data.positions.forEach(pos => {
      lines.push(`- ${pos.name} (${pos.ticker}): Qty ${pos.quantity.toFixed(2)}, PRU ${formatCurrency(pos.averagePurchasePrice)}, Curr. Price ${formatCurrency(pos.currentPrice)}, Value ${formatCurrency(pos.currentValue)}, G/L ${pos.unrealizedGainLoss >= 0 ? '+' : ''}${formatCurrency(pos.unrealizedGainLoss)} (${pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}${formatPercent(pos.unrealizedGainLossPercentage)})`);
    });
    lines.push('');
    lines.push('Transactions (latest first)');
    const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    sortedTransactions.forEach(t => {
      lines.push(`- ${t.date} ${t.type}: ${t.assetName} (${t.ticker}) Qty ${t.quantity} @ ${formatCurrency(t.unitPrice)} | Fees ${formatCurrency(t.fees)} | TTF ${formatCurrency(t.ttf)} | Total ${formatCurrency(t.totalAmount)}`);
    });

    return lines.join('\n');
  };

  const handleCopyContext = async () => {
    const text = buildClipboardText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const annualXirr = useMemo(() => {
    if (transactions.length === 0) return [] as { year: number; value: number }[];

    const parsedTransactions = [...transactions]
      .map(t => ({ ...t, dateObj: new Date(`${t.date}T00:00:00`) }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const firstYear = parsedTransactions[0].dateObj.getFullYear();
    const currentYear = new Date().getFullYear();
    const annualValueMap = annualValues.reduce<Record<number, number>>((acc, entry) => {
      acc[entry.year] = entry.endValue;
      return acc;
    }, {});

    const results: { year: number; value: number }[] = [];

    for (let year = firstYear; year <= currentYear; year += 1) {
      const fallbackCurrentValue = year === currentYear ? data?.summary.currentValue : undefined;
      const endValue = annualValueMap[year] ?? fallbackCurrentValue;
      if (endValue === undefined) continue;

      const startDate = new Date(year, 0, 1);
      const endDate = year === currentYear
        ? new Date(new Date().setHours(0, 0, 0, 0))
        : new Date(year, 11, 31);
      const startValue = year === firstYear ? 0 : annualValueMap[year - 1];
      if (startValue === undefined) continue;

      const cashflows = parsedTransactions
        .filter(t => t.dateObj >= startDate && t.dateObj <= endDate)
        .map(t => ({
          amount: t.type === 'Buy' ? -t.totalAmount : t.totalAmount,
          when: t.dateObj
        }));

      cashflows.unshift({ amount: -startValue, when: startDate });
      cashflows.push({ amount: endValue, when: endDate });

      try {
        const value = xirr(cashflows);
        if (Number.isFinite(value)) {
          results.push({ year, value });
        }
      } catch (error) {
        // Skip years where XIRR fails to converge or lacks cashflows
      }
    }

    return results;
  }, [transactions, annualValues, data?.summary.currentValue]);

  const annualOverviewRows: AnnualOverviewRow[] = useMemo(() => {
    const years: number[] = [];
    const currentYear = new Date().getFullYear();

    if (transactions.length > 0) {
      const firstYear = Math.min(...transactions.map(t => new Date(`${t.date}T00:00:00`).getFullYear()));
      for (let year = firstYear; year <= currentYear; year += 1) {
        years.push(year);
      }
    } else {
      years.push(currentYear);
    }

    const valueMap = annualValues.reduce<Record<number, number>>((acc, entry) => {
      acc[entry.year] = entry.endValue;
      return acc;
    }, {});
    const xirrMap = annualXirr.reduce<Record<number, number>>((acc, entry) => {
      acc[entry.year] = entry.value;
      return acc;
    }, {});

    return years.map(year => ({
      year,
      endValue: valueMap[year] ?? (year === currentYear ? data?.summary.currentValue : undefined),
      xirr: xirrMap[year]
    }));
  }, [transactions, annualValues, annualXirr, data?.summary.currentValue]);

  const historyChartData: HistoryChartPoint[] = useMemo(() => {
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
  }, [history]);

  const historyMetrics: HistoryMetricPoint[] = useMemo(() => {
    return history.map(entry => ({
      date: entry.timestamp.slice(0, 10),
      totalInvested: entry.totalInvested,
      currentValue: entry.currentValue,
      totalGainLoss: entry.totalGainLoss,
      xirr: entry.xirr,
      currentYearXirr: entry.currentYearXirr
    }));
  }, [history]);

  const assetSparklineData: Record<string, AssetSparklinePoint[]> = useMemo(() => {
    const map: Record<string, AssetSparklinePoint[]> = {};
    Object.entries(assetHistory).forEach(([isin, entries]) => {
      map[isin] = entries.map(entry => ({
        date: entry.timestamp.slice(0, 10),
        value: entry.currentPrice
      }));
    });
    return map;
  }, [assetHistory]);

  const assetChartData: Record<string, AssetChartPoint[]> = useMemo(() => {
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
  }, [assetHistory]);

  const activeAssetInfo: AssetMetaInfo | null = useMemo(() => {
    if (!activeAssetIsin || !data?.positions) return null;
    const match = data.positions.find(pos => pos.isin === activeAssetIsin);
    return match ? { name: match.name, isin: match.isin, ticker: match.ticker } : null;
  }, [activeAssetIsin, data?.positions]);

  const openAnnualEditor = (year: number, endValue?: number) => {
    setEditingYear(year);
    setEditingEndValue(endValue !== undefined ? endValue.toString() : '');
  };

  const closeAnnualEditor = () => {
    setEditingYear(null);
    setEditingEndValue('');
  };

  const saveAnnualValue = async () => {
    if (editingYear === null) return;
    const parsedValue = parseFloat(editingEndValue);
    if (Number.isNaN(parsedValue)) {
      alert('Please enter a valid end-of-year value.');
      return;
    }

    try {
      const res = await fetch(`/api/savings/annual/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: editingYear,
          endValue: parsedValue
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setAnnualValues(updated);
        closeAnnualEditor();
      } else {
        const err = await res.json();
        alert(`Failed to save annual value: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to save annual value:', error);
      alert('An error occurred while saving the annual value.');
    }
  };

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
    const sorted = [...data.positions].sort((a, b) => {
      let left: number | string = '';
      let right: number | string = '';

      switch (positionsSort.key) {
        case 'asset':
          left = a.name;
          right = b.name;
          break;
        case 'quantity':
          left = a.quantity;
          right = b.quantity;
          break;
        case 'avgPrice':
          left = a.averagePurchasePrice;
          right = b.averagePurchasePrice;
          break;
        case 'currentPrice':
          left = a.currentPrice;
          right = b.currentPrice;
          break;
        case 'value':
          left = a.currentValue;
          right = b.currentValue;
          break;
        case 'gainLoss':
          left = a.unrealizedGainLoss;
          right = b.unrealizedGainLoss;
          break;
        case 'gainLossPct':
          left = a.unrealizedGainLossPercentage;
          right = b.unrealizedGainLossPercentage;
          break;
      }

      if (typeof left === 'string' || typeof right === 'string') {
        const result = String(left).localeCompare(String(right));
        return positionsSort.direction === 'asc' ? result : -result;
      }

      const result = Number(left) - Number(right);
      return positionsSort.direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [data, positionsSort]);

  const transactionsSorted = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      let left: number | string = '';
      let right: number | string = '';

      switch (transactionsSort.key) {
        case 'date':
          left = a.date;
          right = b.date;
          break;
        case 'type':
          left = a.type;
          right = b.type;
          break;
        case 'asset':
          left = a.assetName;
          right = b.assetName;
          break;
        case 'ticker':
          left = a.ticker;
          right = b.ticker;
          break;
        case 'isin':
          left = a.isin;
          right = b.isin;
          break;
        case 'quantity':
          left = a.quantity;
          right = b.quantity;
          break;
        case 'price':
          left = a.unitPrice;
          right = b.unitPrice;
          break;
        case 'fees':
          left = a.fees;
          right = b.fees;
          break;
        case 'ttf':
          left = a.ttf;
          right = b.ttf;
          break;
        case 'total':
          left = a.totalAmount;
          right = b.totalAmount;
          break;
      }

      if (typeof left === 'string' || typeof right === 'string') {
        const result = String(left).localeCompare(String(right));
        return transactionsSort.direction === 'asc' ? result : -result;
      }

      const result = Number(left) - Number(right);
      return transactionsSort.direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [transactions, transactionsSort]);

  if (loading) return <div className={styles.emptyState}>Loading PEA details...</div>;
  if (!data) return <div className={styles.emptyState}>Error loading data</div>;

  const { summary } = data;

  return (
    <div>
      {showForm && (
        <TransactionForm
          accountId={account.id}
          onSave={handleSaveTransaction}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingYear !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.accountName}>Annual Overview</h2>
            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
              <label className={styles.label}>Year</label>
              <input
                type="text"
                className={styles.input}
                value={editingYear}
                readOnly
              />
            </div>
            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
              <label className={styles.label}>End of Year Value ({account.currency})</label>
              <input
                type="number"
                step="any"
                className={styles.input}
                value={editingEndValue}
                onChange={event => setEditingEndValue(event.target.value)}
                placeholder="e.g. 12500.45"
              />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeAnnualEditor}>
                Cancel
              </button>
              <button type="button" className={styles.button} onClick={saveAnnualValue}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
        onAddTransaction={() => setShowForm(true)}
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
        />
      )}
    </div>
  );
}
