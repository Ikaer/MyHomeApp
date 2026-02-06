import { AssetPriceInfo, PriceHistory } from '@/models/savings';
import yahooFinance from 'yahoo-finance2';

/**
 * Interface for price providers to ensure agnosticism
 */
export interface PriceProvider {
    getCurrentPrice(ticker: string): Promise<number>;
    getHistory(ticker: string, from: Date, to: Date): Promise<PriceHistory[]>;
    getQuote(ticker: string): Promise<AssetPriceInfo>;
}

/**
 * Yahoo Finance implementation of PriceProvider
 * Handle class instantiation required by v3.x
 */
const yf = new (yahooFinance as any)();

function normalizeTicker(ticker: string): string {
    const trimmed = ticker.trim();
    const euronextMatch = /^EPA[.:](.+)$/i.exec(trimmed);
    if (euronextMatch && euronextMatch[1]) {
        return `${euronextMatch[1]}.PA`;
    }
    return trimmed;
}

class YahooFinanceProvider implements PriceProvider {
    async getCurrentPrice(ticker: string): Promise<number> {
        const result = await yf.quote(normalizeTicker(ticker));
        return result.regularMarketPrice || 0;
    }

    async getHistory(ticker: string, from: Date, to: Date): Promise<PriceHistory[]> {
        const result = await yf.historical(normalizeTicker(ticker), {
            period1: from,
            period2: to,
        }) as any[];

        return result.map((item: any) => ({
            date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date),
            price: item.close
        }));
    }

    async getQuote(ticker: string): Promise<AssetPriceInfo> {
        const quote = await yf.quote(normalizeTicker(ticker));
        return {
            ticker,
            currentPrice: quote.regularMarketPrice || 0,
            lastUpdated: new Date().toISOString()
        };
    }
}

/**
 * Singleton instance of the price provider
 */
export const priceProvider: PriceProvider = new YahooFinanceProvider();

/**
 * Utility to fetch multiple prices
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    if (tickers.length === 0) return result;

    // Fetch in parallel
    await Promise.all(tickers.map(async (ticker) => {
        try {
            result[ticker] = await priceProvider.getCurrentPrice(ticker);
        } catch (error) {
            console.error(`Failed to fetch price for ${ticker}:`, error);
            result[ticker] = 0;
        }
    }));

    return result;
}
