/**
 * Savings-related interfaces and types
 */

// ── Account Types ──────────────────────────────────────────────────────────────

export type AccountType = 'PEA' | 'CompteCourant' | 'Interessement' | 'PEL' | 'LivretA' | 'AssuranceVie';

/** Labels for display */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    PEA: 'PEA',
    CompteCourant: 'Compte Courant',
    Interessement: 'Intéressement',
    PEL: 'PEL',
    LivretA: 'Livret A',
    AssuranceVie: 'Assurance-Vie',
};

// ── Type-specific configs ──────────────────────────────────────────────────────

export interface PEAConfig {
    type: 'PEA';
}

export interface CompteCourantConfig {
    type: 'CompteCourant';
}

export interface InteressementConfig {
    type: 'Interessement';
    lock_years: number; // Typically 5
}

export interface PELConfig {
    type: 'PEL';
    opening_date: string;  // ISO date
    gross_rate: number;    // e.g. 0.025 for 2.5%
}

export interface LivretAConfig {
    type: 'LivretA';
    current_rate: number;  // e.g. 0.024 for 2.4%
}

export interface AssuranceVieConfig {
    type: 'AssuranceVie';
    opening_date: string;         // ISO date
    monthly_contribution: number; // e.g. 200
    last_annual_yield: number;    // e.g. 0.028 for 2.8%
}

export type AccountConfig =
    | PEAConfig
    | CompteCourantConfig
    | InteressementConfig
    | PELConfig
    | LivretAConfig
    | AssuranceVieConfig;

// ── Transactions (PEA-specific) ────────────────────────────────────────────────

export type TransactionType = 'Buy' | 'Sell' | 'Dividend' | 'Fee';

export interface Transaction {
    id: string;
    date: string; // ISO format YYYY-MM-DD
    type: TransactionType;
    assetName: string;
    isin: string;
    ticker: string;
    quantity: number;
    unitPrice: number;
    fees: number;
    ttf: number;
    totalAmount: number; // Calculated: (quantity * unitPrice) + fees + ttf for Buy, (quantity * unitPrice) - fees for Sell
}

export interface AssetPosition {
    ticker: string;
    isin: string;
    name: string;
    quantity: number;
    averagePurchasePrice: number;
    totalInvested: number;
    currentPrice: number;
    currentValue: number;
    unrealizedGainLoss: number;
    unrealizedGainLossPercentage: number;
}

// ── Balance snapshots (CompteCourant, PEL, LivretA, AssuranceVie) ──────────

export interface BalanceRecord {
    date: string;   // ISO date YYYY-MM-DD
    balance: number;
}

// ── Deposit records (Intéressement) ────────────────────────────────────────────

export interface DepositRecord {
    id: string;
    deposit_date: string;   // ISO date
    deposit_amount: number;
    strategy: string;       // e.g. "Dynamique (Actions)"
    lock_end_date: string;  // ISO date
    current_value: number;
    value_date: string;     // ISO date when current_value was last updated
}

// ── Account ────────────────────────────────────────────────────────────────────

export interface SavingsAccount {
    id: string;
    name: string;
    type: AccountType;
    description?: string;
    currency: string;
    isDefault?: boolean;
    config?: AccountConfig;
}

// ── Summaries & Valuations ─────────────────────────────────────────────────────

export interface AccountSummary {
    accountId: string;
    totalInvested: number;
    currentValue: number;
    totalGainLoss: number;
    xirr: number;
}

/** Unified valuation returned by the net-worth API */
export interface AccountValuation {
    accountId: string;
    accountName: string;
    accountType: AccountType;
    currentValue: number;
    totalContributed: number;
    totalGainLoss: number;
    gainLossPercentage: number;
    lastUpdated: string;
    isEstimated: boolean;
}

export interface NetWorthSummary {
    total: number;
    accounts: AccountValuation[];
}

// ── Price data ─────────────────────────────────────────────────────────────────

export interface PriceHistory {
    date: string;
    price: number;
}

export interface AssetPriceInfo {
    ticker: string;
    currentPrice: number;
    priceHistory?: PriceHistory[]; // For sparklines
    lastUpdated: string;
}

export interface AnnualAccountValue {
    year: number;
    endValue: number;
    endDate?: string;
}
