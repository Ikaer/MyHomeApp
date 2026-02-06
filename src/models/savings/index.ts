/**
 * Savings-related interfaces and types
 */

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

export interface SavingsAccount {
    id: string;
    name: string;
    type: 'PEA' | 'Life Insurance' | 'Other';
    description?: string;
    currency: string;
}

export interface AccountSummary {
    accountId: string;
    totalInvested: number;
    currentValue: number;
    totalGainLoss: number;
    xirr: number;
}

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
