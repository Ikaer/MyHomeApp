import React, { useState } from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { SavingsAccount } from '@/models/savings';
import { Button, Modal } from '@/components/shared';

interface RecordBalanceModalProps {
    account: SavingsAccount;
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * Reusable modal for recording balance snapshots.
 * Used in both account overview cards and account detail views.
 */
export default function RecordBalanceModal({
    account,
    open,
    onClose,
    onSuccess,
}: RecordBalanceModalProps) {
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newBalance, setNewBalance] = useState('');
    const [saving, setSaving] = useState(false);

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
                setNewBalance('');
                setNewDate(new Date().toISOString().split('T')[0]);
                onClose();
                onSuccess?.();
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

    return (
        <Modal open={open} onClose={onClose} title="Record Balance" size="sm">
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
                        <label className={sharedStyles.label}>Balance ({account.currency})</label>
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
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
