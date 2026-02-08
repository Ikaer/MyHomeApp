import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/shared';
import styles from '@/styles/savings.module.css';
import { Transaction, TransactionType } from '@/models/savings';

interface TransactionFormProps {
    open?: boolean;
    mode?: 'add' | 'edit';
    initialTransaction?: Transaction | null;
    onSave: (transaction: Transaction) => void;
    onClose: () => void;
}

export default function TransactionForm({
    open = true,
    mode = 'add',
    initialTransaction,
    onSave,
    onClose
}: TransactionFormProps) {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Buy' as TransactionType,
        assetName: '',
        isin: '',
        ticker: '',
        quantity: '',
        unitPrice: '',
        fees: '0',
        ttf: '0'
    });

    useEffect(() => {
        if (!initialTransaction) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: 'Buy' as TransactionType,
                assetName: '',
                isin: '',
                ticker: '',
                quantity: '',
                unitPrice: '',
                fees: '0',
                ttf: '0'
            });
            return;
        }

        setFormData({
            date: initialTransaction.date,
            type: initialTransaction.type,
            assetName: initialTransaction.assetName,
            isin: initialTransaction.isin,
            ticker: initialTransaction.ticker,
            quantity: initialTransaction.quantity.toString(),
            unitPrice: initialTransaction.unitPrice.toString(),
            fees: initialTransaction.fees.toString(),
            ttf: initialTransaction.ttf.toString()
        });
    }, [initialTransaction]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const quantity = parseFloat(formData.quantity);
        const unitPrice = parseFloat(formData.unitPrice);
        const fees = parseFloat(formData.fees || '0');
        const ttf = parseFloat(formData.ttf || '0');

        // Calculate total amount based on type
        let totalAmount = 0;
        if (formData.type === 'Buy') {
            totalAmount = (quantity * unitPrice) + fees + ttf;
        } else if (formData.type === 'Sell') {
            totalAmount = (quantity * unitPrice) - fees;
        }

        const transaction: Transaction = {
            id: initialTransaction?.id ?? Math.random().toString(36).substr(2, 9),
            date: formData.date,
            type: formData.type,
            assetName: formData.assetName,
            isin: formData.isin,
            ticker: formData.ticker,
            quantity,
            unitPrice,
            fees,
            ttf,
            totalAmount
        };

        onSave(transaction);
    };

    return (
        <Modal
            open={open}
            title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
            onClose={onClose}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Date</label>
                        <input
                            type="date"
                            name="date"
                            className={styles.input}
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Type</label>
                        <select
                            name="type"
                            className={styles.select}
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="Buy">Buy</option>
                            <option value="Sell">Sell</option>
                            <option value="Dividend">Dividend</option>
                            <option value="Fee">Fee</option>
                        </select>
                    </div>

                    <div className={styles.formGroupFull}>
                        <label className={styles.label}>Asset Name</label>
                        <input
                            type="text"
                            name="assetName"
                            className={styles.input}
                            placeholder="e.g. iShares MSCI World Swap PEA"
                            value={formData.assetName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Ticker</label>
                        <input
                            type="text"
                            name="ticker"
                            className={styles.input}
                            placeholder="e.g. WPEA.PA"
                            value={formData.ticker}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>ISIN</label>
                        <input
                            type="text"
                            name="isin"
                            className={styles.input}
                            placeholder="e.g. IE0002XZSHO1"
                            value={formData.isin}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Quantity</label>
                        <input
                            type="number"
                            step="any"
                            name="quantity"
                            className={styles.input}
                            value={formData.quantity}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Unit Price (EUR)</label>
                        <input
                            type="number"
                            step="any"
                            name="unitPrice"
                            className={styles.input}
                            value={formData.unitPrice}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Fees (EUR)</label>
                        <input
                            type="number"
                            step="any"
                            name="fees"
                            className={styles.input}
                            value={formData.fees}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>TTF (EUR)</label>
                        <input
                            type="number"
                            step="any"
                            name="ttf"
                            className={styles.input}
                            value={formData.ttf}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className={styles.button}>
                        {mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
