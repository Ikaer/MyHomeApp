import React, { useState, useEffect } from 'react';
import styles from '@/styles/savings.module.css';
import { SavingsAccount, Transaction, AssetPosition, AccountSummary } from '@/models/savings';
import TransactionForm from './TransactionForm';

interface PEAOverviewProps {
    account: SavingsAccount;
    onBack: () => void;
}

export default function PEAOverview({ account, onBack }: PEAOverviewProps) {
    const [data, setData] = useState<{ summary: AccountSummary; positions: AssetPosition[] } | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchData();
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

    if (loading) return <div className={styles.emptyState}>Loading PEA details...</div>;
    if (!data) return <div className={styles.emptyState}>Error loading data</div>;

    const { summary, positions } = data;

    return (
        <div>
            {showForm && (
                <TransactionForm
                    accountId={account.id}
                    onSave={handleSaveTransaction}
                    onCancel={() => setShowForm(false)}
                />
            )}

            <div className={styles.header}>
                <button className={styles.secondaryButton} onClick={onBack}>← Back to Dashboard</button>
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

                {/* Quick Actions */}
                <div className={styles.accountCard} style={{ cursor: 'default' }}>
                    <h2 className={styles.accountName}>Actions</h2>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            className={styles.button}
                            style={{ flex: 1 }}
                            onClick={() => setShowForm(true)}
                        >
                            + Add Transaction
                        </button>
                        <button className={styles.secondaryButton} style={{ flex: 1 }} onClick={fetchData}>Refresh Prices</button>
                    </div>
                </div>
            </div>

            <div className={styles.header} style={{ borderBottom: '1px solid rgba(75, 85, 99, 0.3)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <button
                        className={`${styles.secondaryButton} ${activeTab === 'positions' ? styles.button : ''}`}
                        onClick={() => setActiveTab('positions')}
                    >
                        Positions
                    </button>
                    <button
                        className={`${styles.secondaryButton} ${activeTab === 'transactions' ? styles.button : ''}`}
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
                                <th>Asset</th>
                                <th>Quantity</th>
                                <th>Avg. Price</th>
                                <th>Curr. Price</th>
                                <th>Value</th>
                                <th>Gain/Loss %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map(pos => (
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
                                        {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
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
                                <th>Date</th>
                                <th>Type</th>
                                <th>Asset</th>
                                <th>Ticker</th>
                                <th>ISIN</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Fees</th>
                                <th>TTF</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
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
