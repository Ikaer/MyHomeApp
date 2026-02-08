import path from 'path';
import {
    SavingsAccount,
    Transaction,
    AssetPosition,
    AccountSummary,
    AssetPriceInfo,
    TransactionType,
    AnnualAccountValue
} from '@/models/savings';
import { readJsonFile, writeJsonFile, ensureDirectoryExists } from './data';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const SAVINGS_DATA_PATH = path.join(DATA_PATH, 'savings');
const ACCOUNTS_FILE = path.join(SAVINGS_DATA_PATH, 'accounts.json');
const ANNUAL_VALUES_DIR = path.join(SAVINGS_DATA_PATH, 'annual-values');

// Initialize sub-app directory
ensureDirectoryExists(SAVINGS_DATA_PATH);
ensureDirectoryExists(ANNUAL_VALUES_DIR);

/**
 * Get all savings accounts
 */
export function getAllSavingsAccounts(): SavingsAccount[] {
    return readJsonFile<SavingsAccount[]>(ACCOUNTS_FILE, []);
}

/**
 * Get a specific savings account by ID
 */
export function getSavingsAccount(id: string): SavingsAccount | undefined {
    const accounts = getAllSavingsAccounts();
    return accounts.find(a => a.id === id);
}

/**
 * Save or update a savings account
 */
export function saveSavingsAccount(account: SavingsAccount): boolean {
    const accounts = getAllSavingsAccounts();
    const index = accounts.findIndex(a => a.id === account.id);

    if (account.isDefault) {
        for (const existing of accounts) {
            if (existing.id !== account.id && existing.isDefault) {
                existing.isDefault = false;
            }
        }
    }

    if (index >= 0) {
        accounts[index] = account;
    } else {
        accounts.push(account);
    }

    return writeJsonFile(ACCOUNTS_FILE, accounts);
}

/**
 * Set the default savings account (exclusive)
 */
export function setDefaultSavingsAccount(accountId: string): SavingsAccount[] | null {
    const accounts = getAllSavingsAccounts();
    const target = accounts.find(a => a.id === accountId);

    if (!target) {
        return null;
    }

    const updated = accounts.map(account => ({
        ...account,
        isDefault: account.id === accountId
    }));

    const success = writeJsonFile(ACCOUNTS_FILE, updated);
    return success ? updated : null;
}

/**
 * Get transactions for a specific account
 */
export function getTransactions(accountId: string): Transaction[] {
    const transactionsFile = path.join(SAVINGS_DATA_PATH, 'transactions', `${accountId}.json`);
    return readJsonFile<Transaction[]>(transactionsFile, []);
}

/**
 * Save transactions for a specific account
 */
export function saveTransactions(accountId: string, transactions: Transaction[]): boolean {
    const transactionsDir = path.join(SAVINGS_DATA_PATH, 'transactions');
    ensureDirectoryExists(transactionsDir);
    const transactionsFile = path.join(transactionsDir, `${accountId}.json`);
    return writeJsonFile(transactionsFile, transactions);
}

/**
 * Get annual account values for a specific account
 */
export function getAnnualAccountValues(accountId: string): AnnualAccountValue[] {
    const valuesFile = path.join(ANNUAL_VALUES_DIR, `${accountId}.json`);
    return readJsonFile<AnnualAccountValue[]>(valuesFile, []);
}

/**
 * Save annual account values for a specific account
 */
export function saveAnnualAccountValues(accountId: string, values: AnnualAccountValue[]): boolean {
    const valuesFile = path.join(ANNUAL_VALUES_DIR, `${accountId}.json`);
    return writeJsonFile(valuesFile, values);
}

/**
 * Add a transaction to an account
 */
export function addTransaction(accountId: string, transaction: Transaction): boolean {
    const transactions = getTransactions(accountId);
    transactions.push(transaction);
    return saveTransactions(accountId, transactions);
}

/**
 * Update an existing transaction in an account
 */
export function updateTransaction(accountId: string, transaction: Transaction): boolean {
    const transactions = getTransactions(accountId);
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index === -1) return false;
    transactions[index] = transaction;
    return saveTransactions(accountId, transactions);
}

/**
 * Calculate positions and aggregation for an account
 */
export function calculateAccountPositions(accountId: string, currentPrices: Record<string, number>): AssetPosition[] {
    const transactions = getTransactions(accountId);
    const positionsMap: Record<string, AssetPosition> = {};

    for (const t of transactions) {
        if (!positionsMap[t.ticker]) {
            positionsMap[t.ticker] = {
                ticker: t.ticker,
                isin: t.isin,
                name: t.assetName,
                quantity: 0,
                averagePurchasePrice: 0,
                totalInvested: 0,
                currentPrice: currentPrices[t.ticker] || 0,
                currentValue: 0,
                unrealizedGainLoss: 0,
                unrealizedGainLossPercentage: 0
            };
        }

        const pos = positionsMap[t.ticker];

        if (t.type === 'Buy') {
            const newQuantity = pos.quantity + t.quantity;
            const newInvested = pos.totalInvested + t.totalAmount;
            pos.averagePurchasePrice = newInvested / newQuantity; // This is a simplified weighted average
            pos.quantity = newQuantity;
            pos.totalInvested = newInvested;
        } else if (t.type === 'Sell') {
            // For sales, we reduce quantity but totalInvested is tricky. 
            // Simplified: we reduce totalInvested proportionally to the average buy price
            const saleRatio = t.quantity / pos.quantity;
            pos.totalInvested -= pos.totalInvested * saleRatio;
            pos.quantity -= t.quantity;
        }
        // Dividends and other fees would affect totalInvested or current value differently
    }

    // Final calculations
    return Object.values(positionsMap).map(pos => {
        pos.currentPrice = currentPrices[pos.ticker] || pos.currentPrice;
        pos.currentValue = pos.quantity * pos.currentPrice;
        pos.unrealizedGainLoss = pos.currentValue - pos.totalInvested;
        pos.unrealizedGainLossPercentage = pos.totalInvested > 0
            ? (pos.unrealizedGainLoss / pos.totalInvested) * 100
            : 0;
        return pos;
    });
}

import xirr from 'xirr';

/**
 * Calculate XIRR
 */
export function calculateXIRR(transactions: Transaction[], currentValue: number): number {
    if (transactions.length === 0) return 0;

    const cashflows = transactions.map(t => ({
        amount: t.type === 'Buy' ? -t.totalAmount : t.totalAmount, // Negative for buy, positive for sell
        when: new Date(t.date)
    }));

    // Add the terminal value (current value of the portfolio) as a positive cashflow today
    cashflows.push({
        amount: currentValue,
        when: new Date()
    });

    try {
        // xirr can throw if it doesn't converge or if there are no negative/positive cashflows
        return xirr(cashflows);
    } catch (error) {
        console.error('XIRR calculation failed:', error);
        return 0;
    }
}

/**
 * Calculate current year XIRR for an account
 */
export function calculateCurrentYearXIRR(accountId: string, currentValue: number): number {
    const transactions = getTransactions(accountId);
    if (transactions.length === 0) return 0;

    const now = new Date();
    const year = now.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(now.setHours(0, 0, 0, 0));

    const annualValues = getAnnualAccountValues(accountId);
    const previousYearValue = annualValues.find(v => v.year === year - 1)?.endValue;

    const firstTransactionYear = Math.min(
        ...transactions.map(t => new Date(`${t.date}T00:00:00`).getFullYear())
    );

    if (previousYearValue === undefined && firstTransactionYear !== year) {
        return 0;
    }

    const startValue = previousYearValue ?? 0;

    const cashflows = transactions
        .map(t => ({
            amount: t.type === 'Buy' ? -t.totalAmount : t.totalAmount,
            when: new Date(`${t.date}T00:00:00`)
        }))
        .filter(t => t.when >= startDate && t.when <= endDate);

    cashflows.unshift({ amount: -startValue, when: startDate });
    cashflows.push({ amount: currentValue, when: endDate });

    try {
        return xirr(cashflows);
    } catch (error) {
        console.error('Current year XIRR calculation failed:', error);
        return 0;
    }
}

/**
 * Get account summary
 */
export function getAccountSummary(accountId: string, currentPrices: Record<string, number>): AccountSummary | undefined {
    const account = getSavingsAccount(accountId);
    if (!account) return undefined;

    const positions = calculateAccountPositions(accountId, currentPrices);
    const totalInvested = positions.reduce((acc, p) => acc + p.totalInvested, 0);
    const currentValueSum = positions.reduce((acc, p) => acc + p.currentValue, 0);
    const totalGainLoss = currentValueSum - totalInvested;

    const transactions = getTransactions(accountId);
    const xirr = calculateXIRR(transactions, currentValueSum);

    return {
        accountId,
        totalInvested,
        currentValue: currentValueSum,
        totalGainLoss,
        xirr
    };
}
