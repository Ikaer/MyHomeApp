import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import layoutStyles from './savings/SavingsLayout.module.css';
import pageStyles from './savings/SavingsPage.module.css';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount, AccountValuation, NetWorthSummary, ACCOUNT_TYPE_LABELS, AccountType } from '@/models/savings';
import CreateAccountModal from '@/components/savings/CreateAccountModal';
import RecordBalanceModal from '@/components/savings/RecordBalanceModal';
import { Button, Card } from '@/components/shared';

interface HistoricalWealthRecord {
    timestamp: string;
    total: number;
    accountsCount: number;
}

// Account types that support balance recording
const BALANCE_SUPPORTED_TYPES: AccountType[] = ['CompteCourant', 'PEL', 'LivretA', 'AssuranceVie'];

function supportsBalanceRecording(accountType: AccountType): boolean {
    return BALANCE_SUPPORTED_TYPES.includes(accountType);
}

export default function SavingsPage() {
    const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
    const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
    const [wealthHistory, setWealthHistory] = useState<HistoricalWealthRecord[]>([]);
    const [wealthHistoryLoading, setWealthHistoryLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [accountsRes, netWorthRes] = await Promise.all([
                fetch('/api/savings/accounts'),
                fetch('/api/savings/net-worth'),
            ]);

            if (accountsRes.ok) setAccounts(await accountsRes.json());
            if (netWorthRes.ok) setNetWorth(await netWorthRes.json());
        } catch (error) {
            console.error('Failed to fetch savings data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchWealthHistory = useCallback(async () => {
        setWealthHistoryLoading(true);
        try {
            const res = await fetch('/api/savings/historical/general/wealth');
            if (res.ok) {
                setWealthHistory(await res.json());
            } else {
                setWealthHistory([]);
            }
        } catch (error) {
            console.error('Failed to fetch wealth history:', error);
            setWealthHistory([]);
        } finally {
            setWealthHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchWealthHistory();
    }, [fetchWealthHistory]);

    const setDefaultAccount = async (accountId: string) => {
        try {
            const res = await fetch('/api/savings/accounts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });
            if (res.ok) {
                const updated = await res.json();
                setAccounts(updated);
            }
        } catch (error) {
            console.error('Failed to set default account:', error);
        }
    };

    const handleAccountCreated = () => {
        setShowCreateModal(false);
        setLoading(true);
        fetchData();
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

    const wealthChartData = useMemo(() => {
        return wealthHistory.map(entry => ({
            date: entry.timestamp.slice(0, 10),
            total: entry.total
        }));
    }, [wealthHistory]);

    return (
        <div className={layoutStyles.savingsContainer}>
            <Head>
                <title>MyHomeApp - Savings</title>
            </Head>

            <CreateAccountModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={handleAccountCreated}
            />

            <div className={pageStyles.header}>
                <div>
                    <h1 className={pageStyles.title}>Savings Management</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button onClick={() => setShowCreateModal(true)}>
                        + New Account
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className={sharedStyles.emptyState}>Loading accounts...</div>
            ) : (
                <>
                    {/* Net Worth Banner */}
                    {netWorth && (
                        <Card style={{ marginBottom: '2rem' }}>
                            <h2 className={sharedStyles.accountName} style={{ marginBottom: '0.5rem' }}>
                                Total Net Worth
                            </h2>
                            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f3f4f6' }}>
                                {formatCurrency(netWorth.total)}
                            </span>
                            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                {netWorth.accounts.length} account{netWorth.accounts.length !== 1 ? 's' : ''}
                            </div>
                            {wealthHistoryLoading ? (
                                <div className={sharedStyles.chartEmpty}>Loading history...</div>
                            ) : wealthChartData.length === 0 ? (
                                <div className={sharedStyles.chartEmpty}>No historical data available.</div>
                            ) : (
                                <div className={sharedStyles.chartContainer} style={{ height: '180px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={wealthChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                                                dataKey="total"
                                                stroke="#60a5fa"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card>
                    )}

                    {accounts.length === 0 ? (
                        <div className={sharedStyles.emptyState}>
                            <p>No savings accounts found.</p>
                            <Button onClick={() => setShowCreateModal(true)}>
                                + Create Your First Account
                            </Button>
                        </div>
                    ) : (
                        <div className={sharedStyles.accountGrid}>
                            {accounts.map(account => {
                                const valuation = netWorth?.accounts.find(v => v.accountId === account.id);
                                return (
                                    <AccountCard
                                        key={account.id}
                                        account={account}
                                        valuation={valuation}
                                        onSetDefault={() => setDefaultAccount(account.id)}
                                        formatCurrency={formatCurrency}
                                        onBalanceRecorded={fetchData}
                                    />
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function AccountCard({
    account,
    valuation,
    onSetDefault,
    formatCurrency,
    onBalanceRecorded,
}: {
    account: SavingsAccount;
    valuation?: AccountValuation;
    onSetDefault: () => void;
    formatCurrency: (val: number) => string;
    onBalanceRecorded?: () => void;
}) {
    const [showBalanceModal, setShowBalanceModal] = useState(false);

    const typeLabel = ACCOUNT_TYPE_LABELS[account.type] || account.type;
    const hasGainLoss = valuation && valuation.totalGainLoss !== 0;
    const isPositive = (valuation?.totalGainLoss ?? 0) >= 0;
    const supportsBalance = supportsBalanceRecording(account.type);

    return (
        <Card className={pageStyles.accountCard}>
            <RecordBalanceModal
                account={account}
                open={showBalanceModal}
                onClose={() => setShowBalanceModal(false)}
                onSuccess={onBalanceRecorded}
            />

            <div className={pageStyles.accountCardBody}>
                <div className={pageStyles.accountHeader}>
                    <div>
                        <h2 className={sharedStyles.accountName}>{account.name}</h2>
                        <span className={pageStyles.accountType}>{typeLabel}</span>
                    </div>
                    <button
                        className={`${pageStyles.defaultToggle} ${account.isDefault ? pageStyles.defaultActive : ''}`}
                        onClick={onSetDefault}
                        title={account.isDefault ? 'Default account' : 'Set as default'}
                    >
                        {account.isDefault ? '★' : '☆'}
                    </button>
                </div>

                {valuation ? (
                    <div className={sharedStyles.statsGrid}>
                        <div className={sharedStyles.statItem}>
                            <span className={sharedStyles.statLabel}>Current Value</span>
                            <span className={sharedStyles.statValue}>{formatCurrency(valuation.currentValue)}</span>
                        </div>
                        <div className={sharedStyles.statItem}>
                            <span className={sharedStyles.statLabel}>
                                Last Updated{valuation.isEstimated ? ' (est.)' : ''}
                            </span>
                            <span className={sharedStyles.statValue} style={{ fontSize: '0.9rem' }}>
                                {valuation.lastUpdated || '—'}
                            </span>
                        </div>
                        {hasGainLoss && (
                            <div className={sharedStyles.statItem}>
                                <span className={sharedStyles.statLabel}>Gain/Loss</span>
                                <span className={`${sharedStyles.statValue} ${isPositive ? sharedStyles.positive : sharedStyles.negative}`}>
                                    {isPositive ? '+' : ''}{formatCurrency(valuation.totalGainLoss)}
                                    {valuation.gainLossPercentage !== 0 && (
                                        <span style={{ fontSize: '0.85em', marginLeft: '0.5rem' }}>
                                            ({isPositive ? '+' : ''}{valuation.gainLossPercentage.toFixed(2)}%)
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ padding: '1rem 0', color: '#9ca3af', fontSize: '0.875rem' }}>
                        Loading valuation...
                    </div>
                )}
            </div>

            <div className={pageStyles.accountActions}>
                {supportsBalance && (
                    <Button variant="secondary" onClick={() => setShowBalanceModal(true)}>
                        + Record Balance
                    </Button>
                )}
                <Button href={`/savings/${account.id}`} variant="secondary">
                    View Details →
                </Button>
            </div>
        </Card>
    );
}
