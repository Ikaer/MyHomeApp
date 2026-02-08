import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import layoutStyles from './savings/SavingsLayout.module.css';
import pageStyles from './savings/SavingsPage.module.css';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount, AccountSummary, AssetPosition } from '@/models/savings';

export default function SavingsPage() {
    const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/savings/accounts');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div className={layoutStyles.savingsContainer}>
            <Head>
                <title>MyHomeApp - Savings</title>
            </Head>

            <div className={pageStyles.header}>
                <div>
                    <h1 className={pageStyles.title}>Savings Management</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={sharedStyles.button} onClick={() => alert('Add Account feature coming soon!')}>
                        + New Account
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={sharedStyles.emptyState}>Loading accounts...</div>
            ) : accounts.length === 0 ? (
                <div className={sharedStyles.emptyState}>
                    <p>No savings accounts found.</p>
                    <button className={sharedStyles.button} onClick={createSampleAccount}>
                        Create Sample PEA Account
                    </button>
                </div>
            ) : (
                <div className={sharedStyles.accountGrid}>
                    {accounts.map(account => (
                        <AccountCard
                            key={account.id}
                            account={account}
                            onSetDefault={() => setDefaultAccount(account.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    async function createSampleAccount() {
        const sampleAccount: SavingsAccount = {
            id: 'pea-main',
            name: 'Main PEA',
            type: 'PEA',
            currency: 'EUR',
            isDefault: true
        };

        try {
            const res = await fetch('/api/savings/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sampleAccount)
            });
            if (res.ok) fetchAccounts();
        } catch (error) {
            console.error('Failed to create sample account:', error);
        }
    }
}

function AccountCard({
    account,
    onSetDefault
}: {
    account: SavingsAccount;
    onSetDefault: () => void;
}) {
    const [data, setData] = useState<{ summary: AccountSummary; positions: AssetPosition[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch(`/api/savings/summary/${account.id}`);
                if (res.ok) {
                    const summaryData = await res.json();
                    setData(summaryData);
                }
            } catch (error) {
                console.error('Failed to fetch summary:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [account.id]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(val);
    };

    const formatPercent = (val: number) => {
        return (val * 1).toFixed(2) + '%';
    };

    if (loading) return <div className={sharedStyles.accountCard}>Loading summary...</div>;
    if (!data) return <div className={sharedStyles.accountCard}>Error loading data</div>;

    const { summary, positions } = data;
    const isPositive = summary.totalGainLoss >= 0;

    return (
        <div className={sharedStyles.accountCard}>
            <div className={pageStyles.accountHeader}>
                <div>
                    <h2 className={sharedStyles.accountName}>{account.name}</h2>
                    <span className={pageStyles.accountType}>{account.type}</span>
                </div>
                <button
                    className={`${pageStyles.defaultToggle} ${account.isDefault ? pageStyles.defaultActive : ''}`}
                    onClick={onSetDefault}
                    title={account.isDefault ? 'Default account' : 'Set as default'}
                    aria-label={account.isDefault ? 'Default account' : 'Set as default'}
                >
                    {account.isDefault ? '★' : '☆'}
                </button>
            </div>

            <div className={sharedStyles.statsGrid}>
                <div className={sharedStyles.statItem}>
                    <span className={sharedStyles.statLabel}>Total Invested</span>
                    <span className={sharedStyles.statValue}>{formatCurrency(summary.totalInvested)}</span>
                </div>
                <div className={sharedStyles.statItem}>
                    <span className={sharedStyles.statLabel}>Current Value</span>
                    <span className={sharedStyles.statValue}>{formatCurrency(summary.currentValue)}</span>
                </div>
                <div className={sharedStyles.statItem}>
                    <span className={sharedStyles.statLabel}>Total Gain/Loss</span>
                    <span className={`${sharedStyles.statValue} ${isPositive ? sharedStyles.positive : sharedStyles.negative}`}>
                        {isPositive ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
                    </span>
                </div>
                <div className={sharedStyles.statItem}>
                    <span className={sharedStyles.statLabel}>XIRR Performance</span>
                    <span className={`${sharedStyles.statValue} ${summary.xirr >= 0 ? sharedStyles.positive : sharedStyles.negative}`}>
                        {formatPercent(summary.xirr * 100)}
                    </span>
                </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Top Positions</h3>
                <div className={sharedStyles.tableContainer}>
                    <table className={sharedStyles.table}>
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Value</th>
                                <th>G/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.slice(0, 3).map(pos => (
                                <tr key={pos.ticker}>
                                    <td>
                                        <div>{pos.name}</div>
                                        <div className={sharedStyles.ticker}>{pos.ticker}</div>
                                    </td>
                                    <td>{formatCurrency(pos.currentValue)}</td>
                                    <td className={pos.unrealizedGainLoss >= 0 ? sharedStyles.positive : sharedStyles.negative}>
                                        {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <Link href={`/savings/${account.id}`} className={sharedStyles.secondaryButton}>
                    View Full Portfolio →
                </Link>
            </div>
        </div>
    );
}
