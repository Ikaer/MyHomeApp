import React, { useState, useEffect, useCallback } from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount, BalanceRecord } from '@/models/savings';
import { Modal } from '@/components/shared';

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
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newBalance, setNewBalance] = useState('');
    const [saving, setSaving] = useState(false);

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

    const handleAddBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseFloat(newBalance);
        if (isNaN(parsed)) {
            alert('Please enter a valid balance.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/savings/balances/${account.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: newDate, balance: parsed }),
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewBalance('');
                setNewDate(new Date().toISOString().split('T')[0]);
                fetchBalances();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (error) {
            console.error('Error adding balance:', error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

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
            <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Record Balance" size="sm">
                <form onSubmit={handleAddBalance}>
                    <div className={sharedStyles.formGrid}>
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Date</label>
                            <input
                                className={sharedStyles.input}
                                type="date"
                                value={newDate}
                                onChange={e => setNewDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Balance (EUR)</label>
                            <input
                                className={sharedStyles.input}
                                type="number"
                                step="0.01"
                                value={newBalance}
                                onChange={e => setNewBalance(e.target.value)}
                                placeholder="e.g. 23050.00"
                                required
                            />
                        </div>
                    </div>
                    <div className={sharedStyles.formActions}>
                        <button type="button" className={sharedStyles.secondaryButton} onClick={() => setShowAddModal(false)}>
                            Cancel
                        </button>
                        <button type="submit" className={sharedStyles.button} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className={sharedStyles.secondaryButton} onClick={onBack}>← Back</button>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f3f4f6', margin: 0 }}>{account.name}</h1>
                </div>
                <button className={sharedStyles.button} onClick={() => setShowAddModal(true)}>
                    + Record Balance
                </button>
            </div>

            {/* Summary Cards */}
            <div className={sharedStyles.accountGrid}>
                {/* Current Value Card */}
                <div className={sharedStyles.accountCard} style={{ cursor: 'default' }}>
                    <h3 className={sharedStyles.statLabel}>Current Balance</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f3f4f6', marginTop: '0.5rem' }}>
                        {latest ? formatCurrency(latest.balance) : '—'}
                    </div>
                    {latest && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                            as of {latest.date}
                        </div>
                    )}
                </div>

                {/* Config Info Card (if applicable) */}
                {configInfo.length > 0 && (
                    <div className={sharedStyles.accountCard} style={{ cursor: 'default' }}>
                        <h3 className={sharedStyles.statLabel}>Account Parameters</h3>
                        <div className={sharedStyles.statsGrid} style={{ marginTop: '0.75rem' }}>
                            {configInfo.map(item => (
                                <div key={item.label} className={sharedStyles.statItem}>
                                    <span className={sharedStyles.statLabel}>{item.label}</span>
                                    <span className={sharedStyles.statValue} style={{ fontSize: '1rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
