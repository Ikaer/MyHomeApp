import path from 'path';
import {
    SavingsAccount,
    AccountType,
    Transaction,
    AssetPosition,
    AccountSummary,
    AssetPriceInfo,
    TransactionType,
    AnnualAccountValue,
    BalanceRecord,
    DepositRecord,
    AccountValuation,
    NetWorthSummary,
    PELConfig,
    LivretAConfig,
    AssuranceVieConfig,
    InteressementConfig,
} from '@/models/savings';
import { readJsonFile, writeJsonFile, ensureDirectoryExists } from './data';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const SAVINGS_DATA_PATH = path.join(DATA_PATH, 'savings');
const ACCOUNTS_FILE = path.join(SAVINGS_DATA_PATH, 'accounts.json');
const ANNUAL_VALUES_DIR = path.join(SAVINGS_DATA_PATH, 'annual-values');
const BALANCES_DIR = path.join(SAVINGS_DATA_PATH, 'balances');
const DEPOSITS_DIR = path.join(SAVINGS_DATA_PATH, 'deposits');

// Initialize sub-app directories
ensureDirectoryExists(SAVINGS_DATA_PATH);
ensureDirectoryExists(ANNUAL_VALUES_DIR);
ensureDirectoryExists(BALANCES_DIR);
ensureDirectoryExists(DEPOSITS_DIR);

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

// ── Balance Records (CompteCourant, PEL, LivretA, AssuranceVie) ────────────

export function getBalanceRecords(accountId: string): BalanceRecord[] {
    const file = path.join(BALANCES_DIR, `${accountId}.json`);
    const records = readJsonFile<BalanceRecord[]>(file, []);
    return records.sort((a, b) => b.date.localeCompare(a.date)); // newest first
}

export function saveBalanceRecords(accountId: string, records: BalanceRecord[]): boolean {
    const file = path.join(BALANCES_DIR, `${accountId}.json`);
    return writeJsonFile(file, records);
}

export function addBalanceRecord(accountId: string, record: BalanceRecord): boolean {
    const records = getBalanceRecords(accountId);
    // Replace if same date exists, otherwise add
    const idx = records.findIndex(r => r.date === record.date);
    if (idx >= 0) {
        records[idx] = record;
    } else {
        records.push(record);
    }
    return saveBalanceRecords(accountId, records);
}

export function getLatestBalance(accountId: string): BalanceRecord | null {
    const records = getBalanceRecords(accountId);
    return records.length > 0 ? records[0] : null;
}

// ── Deposit Records (Intéressement) ────────────────────────────────────────────

export function getDepositRecords(accountId: string): DepositRecord[] {
    const file = path.join(DEPOSITS_DIR, `${accountId}.json`);
    return readJsonFile<DepositRecord[]>(file, []);
}

export function saveDepositRecords(accountId: string, records: DepositRecord[]): boolean {
    const file = path.join(DEPOSITS_DIR, `${accountId}.json`);
    return writeJsonFile(file, records);
}

export function addOrUpdateDeposit(accountId: string, deposit: DepositRecord): boolean {
    const records = getDepositRecords(accountId);
    const idx = records.findIndex(r => r.id === deposit.id);
    if (idx >= 0) {
        records[idx] = deposit;
    } else {
        records.push(deposit);
    }
    return saveDepositRecords(accountId, records);
}

export function deleteDeposit(accountId: string, depositId: string): boolean {
    const records = getDepositRecords(accountId);
    const filtered = records.filter(r => r.id !== depositId);
    if (filtered.length === records.length) return false;
    return saveDepositRecords(accountId, filtered);
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

// ══════════════════════════════════════════════════════════════════════════════
// Valuation functions — one per account type, all returning AccountValuation
// ══════════════════════════════════════════════════════════════════════════════

function daysBetween(a: string, b: string): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function yearsBetween(a: string, b: string): number {
    return daysBetween(a, b) / 365.25;
}

/**
 * Valuate a PEA account using live market prices.
 * This calls the existing getAccountSummary logic.
 */
async function valuatePEA(account: SavingsAccount, currentPrices: Record<string, number>): Promise<AccountValuation> {
    const summary = getAccountSummary(account.id, currentPrices);
    const transactions = getTransactions(account.id);
    const lastTransaction = transactions.length > 0
        ? transactions.sort((a, b) => b.date.localeCompare(a.date))[0].date
        : new Date().toISOString().split('T')[0];

    return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentValue: summary?.currentValue ?? 0,
        totalContributed: summary?.totalInvested ?? 0,
        totalGainLoss: summary?.totalGainLoss ?? 0,
        gainLossPercentage: summary && summary.totalInvested > 0
            ? (summary.totalGainLoss / summary.totalInvested) * 100
            : 0,
        lastUpdated: new Date().toISOString().split('T')[0],
        isEstimated: false,
    };
}

/**
 * Valuate a Compte Courant — just the latest balance snapshot.
 */
function valuateCompteCourant(account: SavingsAccount): AccountValuation {
    const latest = getLatestBalance(account.id);
    const value = latest?.balance ?? 0;

    return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentValue: value,
        totalContributed: value, // No savings, contributed == current
        totalGainLoss: 0,
        gainLossPercentage: 0,
        lastUpdated: latest?.date ?? '',
        isEstimated: false,
    };
}

/**
 * Valuate Intéressement — sum of current values across all deposits.
 */
function valuateInteressement(account: SavingsAccount): AccountValuation {
    const deposits = getDepositRecords(account.id);
    const totalDeposited = deposits.reduce((s, d) => s + d.deposit_amount, 0);
    const currentValue = deposits.reduce((s, d) => s + d.current_value, 0);
    const gainLoss = currentValue - totalDeposited;
    const latestValueDate = deposits.length > 0
        ? deposits.sort((a, b) => b.value_date.localeCompare(a.value_date))[0].value_date
        : '';

    return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentValue,
        totalContributed: totalDeposited,
        totalGainLoss: gainLoss,
        gainLossPercentage: totalDeposited > 0 ? (gainLoss / totalDeposited) * 100 : 0,
        lastUpdated: latestValueDate,
        isEstimated: false,
    };
}

/**
 * Valuate PEL — compound interest from last known balance.
 */
function valuatePEL(account: SavingsAccount): AccountValuation {
    const config = account.config as PELConfig | undefined;
    const latest = getLatestBalance(account.id);

    if (!latest || !config) {
        return {
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            currentValue: latest?.balance ?? 0,
            totalContributed: latest?.balance ?? 0,
            totalGainLoss: 0,
            gainLossPercentage: 0,
            lastUpdated: latest?.date ?? '',
            isEstimated: false,
        };
    }

    const today = new Date().toISOString().split('T')[0];
    const fractionOfYear = daysBetween(latest.date, today) / 365;

    // Tax regime
    const openingDate = config.opening_date;
    const accountAgeYears = yearsBetween(openingDate, today);
    const openedBefore2018 = new Date(openingDate).getFullYear() < 2018;
    const taxRate = openedBefore2018 && accountAgeYears < 12 ? 0.172 : 0.30;
    const netRate = config.gross_rate * (1 - taxRate);

    // Linear interpolation for partial year since interest is credited annually
    const estimatedValue = latest.balance * (1 + netRate * fractionOfYear);

    // Total contributed: use oldest balance if available, otherwise current balance
    const allBalances = getBalanceRecords(account.id);
    const oldest = allBalances.length > 0
        ? allBalances[allBalances.length - 1]
        : latest;

    return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentValue: Math.round(estimatedValue * 100) / 100,
        totalContributed: oldest.balance,
        totalGainLoss: Math.round((estimatedValue - oldest.balance) * 100) / 100,
        gainLossPercentage: oldest.balance > 0
            ? Math.round(((estimatedValue - oldest.balance) / oldest.balance) * 10000) / 100
            : 0,
        lastUpdated: latest.date,
        isEstimated: fractionOfYear > 0,
    };
}

/**
 * Valuate Livret A — tax-free interest from last known balance.
 */
function valuateLivretA(account: SavingsAccount): AccountValuation {
    const config = account.config as LivretAConfig | undefined;
    const latest = getLatestBalance(account.id);

    if (!latest || !config) {
        return {
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            currentValue: latest?.balance ?? 0,
            totalContributed: latest?.balance ?? 0,
            totalGainLoss: 0,
            gainLossPercentage: 0,
            lastUpdated: latest?.date ?? '',
            isEstimated: false,
        };
    }

    const today = new Date().toISOString().split('T')[0];
    const fractionOfYear = daysBetween(latest.date, today) / 365;

    // Livret A is tax-free — rate is already net
    const estimatedValue = latest.balance * (1 + config.current_rate * fractionOfYear);

    const allBalances = getBalanceRecords(account.id);
    const oldest = allBalances.length > 0
        ? allBalances[allBalances.length - 1]
        : latest;

    return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentValue: Math.round(estimatedValue * 100) / 100,
        totalContributed: oldest.balance,
        totalGainLoss: Math.round((estimatedValue - oldest.balance) * 100) / 100,
        gainLossPercentage: oldest.balance > 0
            ? Math.round(((estimatedValue - oldest.balance) / oldest.balance) * 10000) / 100
            : 0,
        lastUpdated: latest.date,
        isEstimated: fractionOfYear > 0,
    };
}

/**
 * Valuate Assurance-Vie — last balance + monthly contributions since.
 */
function valuateAssuranceVie(account: SavingsAccount): AccountValuation {
    const config = account.config as AssuranceVieConfig | undefined;
    const latest = getLatestBalance(account.id);

    if (!latest || !config) {
        return {
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            currentValue: latest?.balance ?? 0,
            totalContributed: latest?.balance ?? 0,
            totalGainLoss: 0,
            gainLossPercentage: 0,
            lastUpdated: latest?.date ?? '',
            isEstimated: false,
        };
    }

    const today = new Date().toISOString().split('T')[0];
    const monthsSince = daysBetween(latest.date, today) / 30.44; // avg days/month
    const monthsElapsed = Math.max(0, Math.floor(monthsSince));

    const estimatedValue = latest.balance + (config.monthly_contribution * monthsElapsed);

    // Use all balances to estimate total contributed
    const allBalances = getBalanceRecords(account.id);
    const oldest = allBalances.length > 0
        ? allBalances[allBalances.length - 1]
        : latest;

    return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentValue: Math.round(estimatedValue * 100) / 100,
        totalContributed: Math.round(estimatedValue * 100) / 100, // For AV, contributed ≈ current (gains are small intra-year)
        totalGainLoss: 0, // Real gain only known at year-end
        gainLossPercentage: 0,
        lastUpdated: latest.date,
        isEstimated: monthsElapsed > 0,
    };
}

/**
 * Get the valuation of a single account.
 * For PEA accounts, currentPrices must be provided.
 */
export async function getAccountValuation(
    account: SavingsAccount,
    currentPrices?: Record<string, number>
): Promise<AccountValuation> {
    switch (account.type) {
        case 'PEA':
            return valuatePEA(account, currentPrices ?? {});
        case 'CompteCourant':
            return valuateCompteCourant(account);
        case 'Interessement':
            return valuateInteressement(account);
        case 'PEL':
            return valuatePEL(account);
        case 'LivretA':
            return valuateLivretA(account);
        case 'AssuranceVie':
            return valuateAssuranceVie(account);
        default:
            return {
                accountId: account.id,
                accountName: account.name,
                accountType: account.type,
                currentValue: 0,
                totalContributed: 0,
                totalGainLoss: 0,
                gainLossPercentage: 0,
                lastUpdated: '',
                isEstimated: false,
            };
    }
}

/**
 * Compute net worth: sum of all account valuations.
 */
export async function getNetWorth(currentPrices?: Record<string, number>): Promise<NetWorthSummary> {
    const accounts = getAllSavingsAccounts();
    const valuations = await Promise.all(
        accounts.map(account => getAccountValuation(account, currentPrices))
    );
    const total = valuations.reduce((sum, v) => sum + v.currentValue, 0);
    return {
        total: Math.round(total * 100) / 100,
        accounts: valuations,
    };
}
