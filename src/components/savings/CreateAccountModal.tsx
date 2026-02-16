import React, { useState } from 'react';
import { Button, Modal } from '@/components/shared';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { AccountType, ACCOUNT_TYPE_LABELS, SavingsAccount, AccountConfig } from '@/models/savings';

interface CreateAccountModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const ACCOUNT_TYPES: AccountType[] = [
    'PEA', 'CompteCourant', 'Interessement', 'PEL', 'LivretA', 'AssuranceVie'
];

export default function CreateAccountModal({ open, onClose, onCreated }: CreateAccountModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('CompteCourant');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    // Type-specific config fields
    const [lockYears, setLockYears] = useState('5');
    const [openingDate, setOpeningDate] = useState('');
    const [grossRate, setGrossRate] = useState('');
    const [currentRate, setCurrentRate] = useState('');
    const [monthlyContribution, setMonthlyContribution] = useState('');
    const [lastAnnualYield, setLastAnnualYield] = useState('');

    const reset = () => {
        setName('');
        setType('CompteCourant');
        setDescription('');
        setLockYears('5');
        setOpeningDate('');
        setGrossRate('');
        setCurrentRate('');
        setMonthlyContribution('');
        setLastAnnualYield('');
    };

    const buildConfig = (): AccountConfig | undefined => {
        switch (type) {
            case 'PEA':
                return { type: 'PEA' };
            case 'CompteCourant':
                return { type: 'CompteCourant' };
            case 'Interessement':
                return { type: 'Interessement', lock_years: parseInt(lockYears) || 5 };
            case 'PEL':
                return {
                    type: 'PEL',
                    opening_date: openingDate,
                    gross_rate: parseFloat(grossRate) / 100 || 0,
                };
            case 'LivretA':
                return {
                    type: 'LivretA',
                    current_rate: parseFloat(currentRate) / 100 || 0,
                };
            case 'AssuranceVie':
                return {
                    type: 'AssuranceVie',
                    opening_date: openingDate,
                    monthly_contribution: parseFloat(monthlyContribution) || 0,
                    last_annual_yield: parseFloat(lastAnnualYield) / 100 || 0,
                };
            default:
                return undefined;
        }
    };

    const generateId = (accountName: string): string => {
        return accountName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'account';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Please enter an account name.');
            return;
        }

        setSaving(true);

        const account: SavingsAccount = {
            id: generateId(name),
            name: name.trim(),
            type,
            description: description.trim() || undefined,
            currency: 'EUR',
            config: buildConfig(),
        };

        try {
            const res = await fetch('/api/savings/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(account),
            });

            if (res.ok) {
                reset();
                onCreated();
            } else {
                const err = await res.json();
                alert(`Failed to create account: ${err.error}`);
            }
        } catch (error) {
            console.error('Error creating account:', error);
            alert('An error occurred while creating the account.');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title="Create New Account" size="md">
            <form onSubmit={handleSubmit}>
                <div className={sharedStyles.formGrid}>
                    <div className={sharedStyles.formGroup}>
                        <label className={sharedStyles.label}>Account Name</label>
                        <input
                            className={sharedStyles.input}
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Mon Livret A"
                            required
                        />
                    </div>

                    <div className={sharedStyles.formGroup}>
                        <label className={sharedStyles.label}>Account Type</label>
                        <select
                            className={sharedStyles.select}
                            value={type}
                            onChange={e => setType(e.target.value as AccountType)}
                        >
                            {ACCOUNT_TYPES.map(t => (
                                <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
                            ))}
                        </select>
                    </div>

                    <div className={sharedStyles.formGroupFull}>
                        <label className={sharedStyles.label}>Description (optional)</label>
                        <input
                            className={sharedStyles.input}
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>

                    {/* Type-specific config fields */}
                    {type === 'Interessement' && (
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Lock Period (years)</label>
                            <input
                                className={sharedStyles.input}
                                type="number"
                                value={lockYears}
                                onChange={e => setLockYears(e.target.value)}
                                min="1"
                                max="10"
                            />
                        </div>
                    )}

                    {type === 'PEL' && (
                        <>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Opening Date</label>
                                <input
                                    className={sharedStyles.input}
                                    type="date"
                                    value={openingDate}
                                    onChange={e => setOpeningDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Gross Rate (%)</label>
                                <input
                                    className={sharedStyles.input}
                                    type="number"
                                    step="0.01"
                                    value={grossRate}
                                    onChange={e => setGrossRate(e.target.value)}
                                    placeholder="e.g. 2.5"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {type === 'LivretA' && (
                        <div className={sharedStyles.formGroup}>
                            <label className={sharedStyles.label}>Current Rate (%)</label>
                            <input
                                className={sharedStyles.input}
                                type="number"
                                step="0.01"
                                value={currentRate}
                                onChange={e => setCurrentRate(e.target.value)}
                                placeholder="e.g. 2.4"
                                required
                            />
                        </div>
                    )}

                    {type === 'AssuranceVie' && (
                        <>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Opening Date</label>
                                <input
                                    className={sharedStyles.input}
                                    type="date"
                                    value={openingDate}
                                    onChange={e => setOpeningDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Monthly Contribution (EUR)</label>
                                <input
                                    className={sharedStyles.input}
                                    type="number"
                                    step="1"
                                    value={monthlyContribution}
                                    onChange={e => setMonthlyContribution(e.target.value)}
                                    placeholder="e.g. 200"
                                    required
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
                                <label className={sharedStyles.label}>Last Annual Yield (%)</label>
                                <input
                                    className={sharedStyles.input}
                                    type="number"
                                    step="0.01"
                                    value={lastAnnualYield}
                                    onChange={e => setLastAnnualYield(e.target.value)}
                                    placeholder="e.g. 2.8"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className={sharedStyles.formActions}>
                    <Button type="button" variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Creating...' : 'Create Account'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
