import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import layoutStyles from './savings/SavingsLayout.module.css';
import pageStyles from './savings/SavingsPage.module.css';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount, AccountValuation, NetWorthSummary, ACCOUNT_TYPE_LABELS, AccountType } from '@/models/savings';
import CreateAccountModal from '@/components/savings/CreateAccountModal';

export default function SavingsPage() {
    const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
    const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                    <button className={sharedStyles.button} onClick={() => setShowCreateModal(true)}>
                        + New Account
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={sharedStyles.emptyState}>Loading accounts...</div>
            ) : (
                <>
                    {/* Net Worth Banner */}
                    {netWorth && (
                        <div className={sharedStyles.accountCard} style={{ marginBottom: '2rem', cursor: 'default' }}>
                            <h2 className={sharedStyles.accountName} style={{ marginBottom: '0.5rem' }}>
                                Total Net Worth
                            </h2>
                            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f3f4f6' }}>
                                {formatCurrency(netWorth.total)}
                            </span>
                            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                {netWorth.accounts.length} account{netWorth.accounts.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}

                    {accounts.length === 0 ? (
                        <div className={sharedStyles.emptyState}>
                            <p>No savings accounts found.</p>
                            <button className={sharedStyles.button} onClick={() => setShowCreateModal(true)}>
                                + Create Your First Account
                            </button>
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
}: {
    account: SavingsAccount;
    valuation?: AccountValuation;
    onSetDefault: () => void;
    formatCurrency: (val: number) => string;
}) {
    const typeLabel = ACCOUNT_TYPE_LABELS[account.type] || account.type;
    const hasGainLoss = valuation && valuation.totalGainLoss !== 0;
    const isPositive = (valuation?.totalGainLoss ?? 0) >= 0;

    return (
        <div className={sharedStyles.accountCard}>
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
                    {valuation.lastUpdated && (
                        <div className={sharedStyles.statItem}>
                            <span className={sharedStyles.statLabel}>
                                Last Updated{valuation.isEstimated ? ' (est.)' : ''}
                            </span>
                            <span className={sharedStyles.statValue} style={{ fontSize: '0.9rem' }}>
                                {valuation.lastUpdated}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ padding: '1rem 0', color: '#9ca3af', fontSize: '0.875rem' }}>
                    Loading valuation...
                </div>
            )}

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <Link href={`/savings/${account.id}`} className={sharedStyles.secondaryButton}>
                    View Details →
                </Link>
            </div>
        </div>
    );
}
