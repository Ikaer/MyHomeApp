import React, { useState, useEffect, useCallback } from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount, BalanceRecord } from '@/models/savings';
import { Button, Card } from '@/components/shared';
import RecordBalanceModal from './RecordBalanceModal';

interface BalanceAccountDetailsProps {
    account: SavingsAccount;
    onBack: () => void;
}

/**
 * Detail view for balance-based accounts: CompteCourant, PEL, LivretA, AssuranceVie.
 * Shows balance history and lets the user add new balance snapshots.
 */
export default function BalanceAccountDetails({ account, onBack }: BalanceAccountDetailsProps) {
    const [balances, setBalances] = useState<BalanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(val);

    const fetchBalances = useCallback(async () => {
        try {
            const res = await fetch(`/api/savings/balances/${account.id}`);
            if (res.ok) {
                setBalances(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch balances:', error);
        } finally {
            setLoading(false);
        }
    }, [account.id]);

    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

    const latest = balances.length > 0 ? balances[0] : null;

    // Account-type specific info
    const config = account.config;
    const configInfo: { label: string; value: string }[] = [];

    if (config?.type === 'PEL') {
        configInfo.push({ label: 'Opening Date', value: config.opening_date });
        configInfo.push({ label: 'Gross Rate', value: `${(config.gross_rate * 100).toFixed(2)}%` });
    } else if (config?.type === 'LivretA') {
        configInfo.push({ label: 'Current Rate', value: `${(config.current_rate * 100).toFixed(2)}%` });
    } else if (config?.type === 'AssuranceVie') {
        configInfo.push({ label: 'Opening Date', value: config.opening_date });
        configInfo.push({ label: 'Monthly Contribution', value: formatCurrency(config.monthly_contribution) });
        configInfo.push({ label: 'Last Annual Yield', value: `${(config.last_annual_yield * 100).toFixed(2)}%` });
    }

    return (
        <div>
            <RecordBalanceModal
                account={account}
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchBalances}
            />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Button variant="secondary" onClick={onBack}>← Back</Button>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f3f4f6', margin: 0 }}>{account.name}</h1>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    + Record Balance
                </Button>
            </div>

            {/* Summary Cards */}
            <div className={sharedStyles.accountGrid}>
                {/* Current Value Card */}
                <Card>
                    <h3 className={sharedStyles.statLabel}>Current Balance</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f3f4f6', marginTop: '0.5rem' }}>
                        {latest ? formatCurrency(latest.balance) : '—'}
                    </div>
                    {latest && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                            as of {latest.date}
                        </div>
                    )}
                </Card>

                {/* Config Info Card (if applicable) */}
                {configInfo.length > 0 && (
                    <Card>
                        <h3 className={sharedStyles.statLabel}>Account Parameters</h3>
                        <div className={sharedStyles.statsGrid} style={{ marginTop: '0.75rem' }}>
                            {configInfo.map(item => (
                                <div key={item.label} className={sharedStyles.statItem}>
                                    <span className={sharedStyles.statLabel}>{item.label}</span>
                                    <span className={sharedStyles.statValue} style={{ fontSize: '1rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Balance History Table */}
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#9ca3af', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Balance History
                </h3>
                {loading ? (
                    <div className={sharedStyles.emptyState}>Loading...</div>
                ) : balances.length === 0 ? (
                    <div className={sharedStyles.emptyState}>
                        No balance records yet. Click &quot;+ Record Balance&quot; to add one.
                    </div>
                ) : (
                    <div className={sharedStyles.tableContainer}>
                        <table className={sharedStyles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Balance</th>
                                    {balances.length > 1 && <th>Change</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {balances.map((record, idx) => {
                                    const prev = idx < balances.length - 1 ? balances[idx + 1] : null;
                                    const change = prev ? record.balance - prev.balance : null;
                                    const isPositive = change !== null && change >= 0;

                                    return (
                                        <tr key={record.date}>
                                            <td>{record.date}</td>
                                            <td>{formatCurrency(record.balance)}</td>
                                            {balances.length > 1 && (
                                                <td className={change !== null ? (isPositive ? sharedStyles.positive : sharedStyles.negative) : ''}>
                                                    {change !== null
                                                        ? `${isPositive ? '+' : ''}${formatCurrency(change)}`
                                                        : '—'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
