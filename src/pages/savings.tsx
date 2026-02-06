import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/savings.module.css';
import { SavingsAccount, AccountSummary, AssetPosition } from '@/models/savings';
import PEAOverview from '@/components/savings/PEAOverview';

export default function SavingsPage() {
    const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    if (selectedAccount) {
        return (
            <div className={styles.savingsContainer}>
                <Head>
                    <title>MyHomeApp - {selectedAccount.name}</title>
                </Head>
                <PEAOverview
                    account={selectedAccount}
                    onBack={() => setSelectedAccountId(null)}
                />
            </div>
        );
    }

    return (
        <div className={styles.savingsContainer}>
            <Head>
                <title>MyHomeApp - Savings</title>
            </Head>

            <div className={styles.header}>
                <div>
                    <Link href="/" className={styles.secondaryButton} style={{ marginBottom: '1rem', display: 'inline-block' }}>
                        ← Back to Dashboard
                    </Link>
                    <h1 className={styles.title}>Savings Management</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={styles.button} onClick={() => alert('Add Account feature coming soon!')}>
                        + New Account
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.emptyState}>Loading accounts...</div>
            ) : accounts.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No savings accounts found.</p>
                    <button className={styles.button} onClick={createSampleAccount}>
                        Create Sample PEA Account
                    </button>
                </div>
            ) : (
                <div className={styles.accountGrid}>
                    {accounts.map(account => (
                        <AccountCard
                            key={account.id}
                            account={account}
                            onView={() => setSelectedAccountId(account.id)}
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
            currency: 'EUR'
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

function AccountCard({ account, onView }: { account: SavingsAccount, onView: () => void }) {
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

    if (loading) return <div className={styles.accountCard}>Loading summary...</div>;
    if (!data) return <div className={styles.accountCard}>Error loading data</div>;

    const { summary, positions } = data;
    const isPositive = summary.totalGainLoss >= 0;

    return (
        <div className={styles.accountCard}>
            <div className={styles.accountHeader}>
                <h2 className={styles.accountName}>{account.name}</h2>
                <span className={styles.accountType}>{account.type}</span>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Invested</span>
                    <span className={styles.statValue}>{formatCurrency(summary.totalInvested)}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Current Value</span>
                    <span className={styles.statValue}>{formatCurrency(summary.currentValue)}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Gain/Loss</span>
                    <span className={`${styles.statValue} ${isPositive ? styles.positive : styles.negative}`}>
                        {isPositive ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>XIRR Performance</span>
                    <span className={`${styles.statValue} ${summary.xirr >= 0 ? styles.positive : styles.negative}`}>
                        {formatPercent(summary.xirr * 100)}
                    </span>
                </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Top Positions</h3>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
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
                                        <div className={styles.ticker}>{pos.ticker}</div>
                                    </td>
                                    <td>{formatCurrency(pos.currentValue)}</td>
                                    <td className={pos.unrealizedGainLoss >= 0 ? styles.positive : styles.negative}>
                                        {pos.unrealizedGainLoss >= 0 ? '+' : ''}{formatPercent(pos.unrealizedGainLossPercentage)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button className={styles.secondaryButton} onClick={onView}>View Full Portfolio →</button>
            </div>
        </div>
    );
}
