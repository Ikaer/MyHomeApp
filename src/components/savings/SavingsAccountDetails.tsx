import React, { useMemo, useState, useEffect } from 'react';
import xirr from 'xirr';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from 'recharts';
import styles from '@/styles/savings.module.css';
import { SavingsAccount, Transaction, AssetPosition, AccountSummary, AnnualAccountValue } from '@/models/savings';
import TransactionForm from './TransactionForm';

interface SavingsAccountDetailsProps {
    account: SavingsAccount;
    onBack: () => void;
}

interface HistoricalAccountRecord {
    timestamp: string;
    accountId: string;
    accountName: string;
    totalInvested: number;
    currentValue: number;
    totalGainLoss: number;
    xirr: number;
    currentYearXirr: number;
}

export default function SavingsAccountDetails({ account, onBack }: SavingsAccountDetailsProps) {
    const [data, setData] = useState<{ summary: AccountSummary; positions: AssetPosition[] } | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [annualValues, setAnnualValues] = useState<AnnualAccountValue[]>([]);
    const [history, setHistory] = useState<HistoricalAccountRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
    const [showForm, setShowForm] = useState(false);
    const [editingYear, setEditingYear] = useState<number | null>(null);
    const [editingEndValue, setEditingEndValue] = useState<string>('');
    const [positionsSort, setPositionsSort] = useState<{ key: PositionSortKey; direction: SortDirection }>(
        { key: 'asset', direction: 'asc' }
    );
    const [transactionsSort, setTransactionsSort] = useState<{ key: TransactionSortKey; direction: SortDirection }>(
        { key: 'date', direction: 'desc' }
    );

    useEffect(() => {
        fetchData();
        fetchAnnualValues();
        fetchHistory();
    }, [account.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sumRes, transRes] = await Promise.all([
                fetch(`/api/savings/summary/${account.id}`),
                fetch(`/api/savings/transactions/${account.id}`)
            ]);

            if (sumRes.ok && transRes.ok) {
                setData(await sumRes.json());
                setTransactions(await transRes.json());
            }
        } catch (error) {
            console.error('Failed to fetch PEA data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnualValues = async () => {
        try {
            const res = await fetch(`/api/savings/annual/${account.id}`);
            if (res.ok) {
                const data = await res.json();
                setAnnualValues(data);
            }
        } catch (error) {
            console.error('Failed to fetch annual values:', error);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/savings/historical/accounts/${account.id}`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Failed to fetch account history:', error);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
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
                fetchData();
            } else {
                const err = await res.json();
                alert(`Failed to save transaction: ${err.error}`);
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('An error occurred while saving the transaction.');
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(val);
    };

    const formatPercent = (val: number) => {
        return (val * 1).toFixed(2) + '%';
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

    const annualOverviewRows = useMemo(() => {
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

    const historyChartData = useMemo(() => {
        return history
            .map(entry => {
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

    type SortDirection = 'asc' | 'desc';
    type PositionSortKey = 'asset' | 'quantity' | 'avgPrice' | 'currentPrice' | 'value' | 'gainLoss' | 'gainLossPct';
    type TransactionSortKey = 'date' | 'type' | 'asset' | 'ticker' | 'isin' | 'quantity' | 'price' | 'fees' | 'ttf' | 'total';

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
        if (!data) return [] as AssetPosition[];
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

            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className={styles.secondaryButton} onClick={onBack}>← Go to accounts</button>
                    <div style={{ width: '2rem' }} />
                    <button className={styles.button} onClick={() => setShowForm(true)}>
                        + Add Transaction
                    </button>
                    <button className={styles.secondaryButton} onClick={fetchData}>Refresh Prices</button>
                    <button className={styles.secondaryButton} onClick={handleCopyContext}>Copy Context</button>
                </div>
                <h1 className={styles.title}>{account.name}</h1>
            </div>

            <div className={styles.accountGrid}>
                {/* Performance Summary */}
                <div className={styles.accountCard} style={{ cursor: 'default' }}>
                    <h2 className={styles.accountName}>Performance</h2>
                    <div className={styles.statsGrid} style={{ marginTop: '1rem' }}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Current Value</span>
                            <span className={styles.statValue} style={{ fontSize: '2rem' }}>{formatCurrency(summary.currentValue)}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Gain/Loss</span>
                            <span className={`${styles.statValue} ${summary.totalGainLoss >= 0 ? styles.positive : styles.negative}`} style={{ fontSize: '1.5rem' }}>
                                {summary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>XIRR (Annualized)</span>
                            <span className={`${styles.statValue} ${summary.xirr >= 0 ? styles.positive : styles.negative}`}>
                                {formatPercent(summary.xirr * 100)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Portfolio Value */}
                <div className={styles.accountCard} style={{ cursor: 'default' }}>
                    <h2 className={styles.accountName}>Portfolio Value</h2>
                    {historyLoading ? (
                        <div className={styles.chartEmpty}>Loading history...</div>
                    ) : historyChartData.length === 0 ? (
                        <div className={styles.chartEmpty}>No historical data available.</div>
                    ) : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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

                {/* Gain/Loss % */}
                <div className={styles.accountCard} style={{ cursor: 'default' }}>
                    <h2 className={styles.accountName}>Gain/Loss %</h2>
                    {historyLoading ? (
                        <div className={styles.chartEmpty}>Loading history...</div>
                    ) : historyChartData.length === 0 ? (
                        <div className={styles.chartEmpty}>No historical data available.</div>
                    ) : (
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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

                {/* Annual XIRR */}
                <div className={styles.accountCard} style={{ cursor: 'default' }}>
                    <h2 className={styles.accountName}>Annual Overview</h2>
                    {annualOverviewRows.length === 0 ? (
                        <div className={styles.emptyState} style={{ padding: '1.5rem 0' }}>
                            No annual data available.
                        </div>
                    ) : (
                        <div className={styles.tableContainer} style={{ marginTop: '1rem' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Year</th>
                                        <th>End Value</th>
                                        <th>XIRR</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {annualOverviewRows.map(entry => (
                                        <tr key={entry.year}>
                                            <td>{entry.year}</td>
                                            <td>{entry.endValue === undefined ? '—' : formatCurrency(entry.endValue)}</td>
                                            <td className={entry.xirr === undefined ? '' : (entry.xirr >= 0 ? styles.positive : styles.negative)}>
                                                {entry.xirr === undefined ? '—' : `${entry.xirr >= 0 ? '+' : ''}${formatPercent(entry.xirr * 100)}`}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    className={styles.secondaryButton}
                                                    onClick={() => openAnnualEditor(entry.year, entry.endValue)}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                
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
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${positionsSort.key === 'asset' ? styles.sortActive : ''}`}
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'asset'))}
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
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'quantity'))}
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
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'avgPrice'))}
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
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'currentPrice'))}
                                    >
                                        Curr. Price
                                        <span className={styles.sortIndicator}>
                                            {positionsSort.key === 'currentPrice' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${positionsSort.key === 'value' ? styles.sortActive : ''}`}
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'value'))}
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
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'gainLoss'))}
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
                                        onClick={() => setPositionsSort(toggleSort(positionsSort, 'gainLossPct'))}
                                    >
                                        Gain/Loss %
                                        <span className={styles.sortIndicator}>
                                            {positionsSort.key === 'gainLossPct' ? (positionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {positionsSorted.map(pos => (
                                <tr key={pos.ticker}>
                                    <td>
                                        <strong>{pos.name}</strong>
                                        <br />
                                        <span className={styles.ticker}>{pos.ticker}</span>
                                    </td>
                                    <td>{pos.quantity.toFixed(2)}</td>
                                    <td>{formatCurrency(pos.averagePurchasePrice)}</td>
                                    <td>{formatCurrency(pos.currentPrice)}</td>
                                    <td>{formatCurrency(pos.currentValue)}</td>
                                    <td className={pos.unrealizedGainLoss >= 0 ? styles.positive : styles.negative}>
                                        {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedGainLoss)}
                                    </td>
                                    <td className={pos.unrealizedGainLossPercentage >= 0 ? styles.positive : styles.negative}>
                                        {pos.unrealizedGainLossPercentage >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'date' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'date'))}
                                    >
                                        Date
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'date' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'type' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'type'))}
                                    >
                                        Type
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'type' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'asset' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'asset'))}
                                    >
                                        Asset
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'asset' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'ticker' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'ticker'))}
                                    >
                                        Ticker
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'ticker' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'isin' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'isin'))}
                                    >
                                        ISIN
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'isin' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'quantity' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'quantity'))}
                                    >
                                        Quantity
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'quantity' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'price' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'price'))}
                                    >
                                        Price
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'price' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'fees' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'fees'))}
                                    >
                                        Fees
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'fees' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'ttf' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'ttf'))}
                                    >
                                        TTF
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'ttf' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                                <th className={styles.sortableHeader}>
                                    <button
                                        className={`${styles.sortButton} ${transactionsSort.key === 'total' ? styles.sortActive : ''}`}
                                        onClick={() => setTransactionsSort(toggleSort(transactionsSort, 'total'))}
                                    >
                                        Total
                                        <span className={styles.sortIndicator}>
                                            {transactionsSort.key === 'total' ? (transactionsSort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactionsSorted.map(t => (
                                <tr key={t.id}>
                                    <td>{t.date}</td>
                                    <td style={{ color: t.type === 'Buy' ? '#60a5fa' : '#ef4444' }}>{t.type}</td>
                                    <td>{t.assetName}</td>
                                    <td>{t.ticker}</td>
                                    <td>{t.isin}</td>
                                    <td>{t.quantity}</td>
                                    <td>{formatCurrency(t.unitPrice)}</td>
                                    <td>{formatCurrency(t.fees)}</td>
                                    <td>{formatCurrency(t.ttf)}</td>
                                    <td>{formatCurrency(t.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
