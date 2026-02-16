import React, { useState, useEffect, useCallback } from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount, DepositRecord, InteressementConfig } from '@/models/savings';
import { Card, Modal } from '@/components/shared';

interface InteressementDetailsProps {
    account: SavingsAccount;
    onBack: () => void;
}

/**
 * Detail view for Intéressement (profit-sharing) accounts.
 * Shows individual deposits with lock dates, strategies, and current values.
 */
export default function InteressementDetails({ account, onBack }: InteressementDetailsProps) {
    const [deposits, setDeposits] = useState<DepositRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const config = account.config as InteressementConfig | undefined;
    const lockYears = config?.lock_years ?? 5;

    const [depositDate, setDepositDate] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [strategy, setStrategy] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [valueDate, setValueDate] = useState(new Date().toISOString().split('T')[0]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(val);

    const fetchDeposits = useCallback(async () => {
        try {
            const res = await fetch(`/api/savings/deposits/${account.id}`);
            if (res.ok) {
                setDeposits(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch deposits:', error);
        } finally {
            setLoading(false);
        }
    }, [account.id]);

    useEffect(() => {
        fetchDeposits();
    }, [fetchDeposits]);

    const computeLockEndDate = (date: string): string => {
        const d = new Date(date);
        d.setFullYear(d.getFullYear() + lockYears);
        return d.toISOString().split('T')[0];
    };

    const resetForm = () => {
        setDepositDate('');
        setDepositAmount('');
        setStrategy('');
        setCurrentValue('');
        setValueDate(new Date().toISOString().split('T')[0]);
        setEditingDeposit(null);
    };

    const openAdd = () => {
        resetForm();
        setShowAddModal(true);
    };

    const openEdit = (deposit: DepositRecord) => {
        setEditingDeposit(deposit);
        setDepositDate(deposit.deposit_date);
        setDepositAmount(deposit.deposit_amount.toString());
        setStrategy(deposit.strategy);
        setCurrentValue(deposit.current_value.toString());
        setValueDate(deposit.value_date);
        setShowAddModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        const value = parseFloat(currentValue);
        if (isNaN(amount)) {
            alert('Please enter a valid deposit amount.');
            return;
        }

        setSaving(true);

        const deposit: DepositRecord = {
            id: editingDeposit?.id || `int-${Date.now()}`,
            deposit_date: depositDate,
            deposit_amount: amount,
            strategy,
            lock_end_date: computeLockEndDate(depositDate),
            current_value: isNaN(value) ? amount : value,
            value_date: valueDate,
        };

        try {
            const method = editingDeposit ? 'PUT' : 'POST';
            const res = await fetch(`/api/savings/deposits/${account.id}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deposit),
            });

            if (res.ok) {
                setShowAddModal(false);
                resetForm();
                fetchDeposits();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (error) {
            console.error('Error saving deposit:', error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (depositId: string) => {
        if (!confirm('Delete this deposit?')) return;
        try {
            const res = await fetch(`/api/savings/deposits/${account.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ depositId }),
            });
            if (res.ok) fetchDeposits();
        } catch (error) {
            console.error('Error deleting deposit:', error);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const totalDeposited = deposits.reduce((s, d) => s + d.deposit_amount, 0);
    const totalCurrentValue = deposits.reduce((s, d) => s + d.current_value, 0);
    const totalGainLoss = totalCurrentValue - totalDeposited;
    const isPositive = totalGainLoss >= 0;

    return (
        <div>
            <Modal
                open={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                title={editingDeposit ? 'Edit Deposit' : 'Add Deposit'}
                size="md"
            >
                <form onSubmit={handleSubmit}>
                    <div className={sharedStyles.formGrid}>
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Deposit Date</label>
                            <input
                                className={sharedStyles.input}
                                type="date"
                                value={depositDate}
                                onChange={e => setDepositDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Deposit Amount (EUR)</label>
                            <input
                                className={sharedStyles.input}
                                type="number"
                                step="0.01"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                placeholder="e.g. 3200"
                                required
                            />
                        </div>
                        <div className={sharedStyles.formGroupFull}>
                            <label className={sharedStyles.label}>Strategy / Fund</label>
                            <input
                                className={sharedStyles.input}
                                type="text"
                                value={strategy}
                                onChange={e => setStrategy(e.target.value)}
                                placeholder="e.g. Dynamique (Actions)"
                            />
                        </div>
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Current Value (EUR)</label>
                            <input
                                className={sharedStyles.input}
                                type="number"
                                step="0.01"
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
                                placeholder="From provider UI"
                            />
                        </div>
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Value Date</label>
                            <input
                                className={sharedStyles.input}
                                type="date"
                                value={valueDate}
                                onChange={e => setValueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    {depositDate && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                            Lock ends: {computeLockEndDate(depositDate)}
                        </div>
                    )}
                    <div className={sharedStyles.formActions}>
                        <button type="button" className={sharedStyles.secondaryButton} onClick={() => { setShowAddModal(false); resetForm(); }}>
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
                <button className={sharedStyles.button} onClick={openAdd}>
                    + Add Deposit
                </button>
            </div>

            {/* Summary Cards */}
            <div className={sharedStyles.accountGrid}>
                <Card>
                    <h3 className={sharedStyles.statLabel}>Total Current Value</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f3f4f6', marginTop: '0.5rem' }}>
                        {formatCurrency(totalCurrentValue)}
                    </div>
                </Card>
                <Card>
                    <div className={sharedStyles.statsGrid}>
                        <div className={sharedStyles.statItem}>
                            <span className={sharedStyles.statLabel}>Total Deposited</span>
                            <span className={sharedStyles.statValue}>{formatCurrency(totalDeposited)}</span>
                        </div>
                        <div className={sharedStyles.statItem}>
                            <span className={sharedStyles.statLabel}>Total Gain/Loss</span>
                            <span className={`${sharedStyles.statValue} ${isPositive ? sharedStyles.positive : sharedStyles.negative}`}>
                                {isPositive ? '+' : ''}{formatCurrency(totalGainLoss)}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Deposits Table */}
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#9ca3af', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Deposits
                </h3>
                {loading ? (
                    <div className={sharedStyles.emptyState}>Loading...</div>
                ) : deposits.length === 0 ? (
                    <div className={sharedStyles.emptyState}>
                        No deposits yet. Click &quot;+ Add Deposit&quot; to add one.
                    </div>
                ) : (
                    <div className={sharedStyles.tableContainer}>
                        <table className={sharedStyles.table}>
                            <thead>
                                <tr>
                                    <th>Deposit Date</th>
                                    <th>Amount</th>
                                    <th>Strategy</th>
                                    <th>Current Value</th>
                                    <th>Gain/Loss</th>
                                    <th>Unlock Date</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {deposits.map(dep => {
                                    const gl = dep.current_value - dep.deposit_amount;
                                    const glPct = dep.deposit_amount > 0 ? (gl / dep.deposit_amount * 100) : 0;
                                    const isUnlocked = dep.lock_end_date <= today;
                                    const glPositive = gl >= 0;

                                    return (
                                        <tr key={dep.id}>
                                            <td>{dep.deposit_date}</td>
                                            <td>{formatCurrency(dep.deposit_amount)}</td>
                                            <td>{dep.strategy || '—'}</td>
                                            <td>
                                                {formatCurrency(dep.current_value)}
                                                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                                    as of {dep.value_date}
                                                </div>
                                            </td>
                                            <td className={glPositive ? sharedStyles.positive : sharedStyles.negative}>
                                                {glPositive ? '+' : ''}{formatCurrency(gl)}
                                                <span style={{ fontSize: '0.8em', marginLeft: '0.4rem' }}>
                                                    ({glPositive ? '+' : ''}{glPct.toFixed(1)}%)
                                                </span>
                                            </td>
                                            <td>{dep.lock_end_date}</td>
                                            <td>
                                                <span style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: isUnlocked ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
                                                    color: isUnlocked ? '#10b981' : '#fbbf24',
                                                }}>
                                                    {isUnlocked ? 'Unlocked' : 'Locked'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className={sharedStyles.secondaryButton} onClick={() => openEdit(dep)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                        Edit
                                                    </button>
                                                    <button className={sharedStyles.secondaryButton} onClick={() => handleDelete(dep.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#ef4444' }}>
                                                        Del
                                                    </button>
                                                </div>
                                            </td>
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
