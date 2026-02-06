import { calculateXIRR } from '../src/lib/savings';
import { priceProvider } from '../src/lib/finance';
import { Transaction } from '../src/models/savings';

async function testXIRR() {
    console.log('--- Testing XIRR Calculation ---');

    // Sample data from the user document
    const transactions: Transaction[] = [
        { id: '1', date: '2025-06-06', type: 'Achat', assetName: 'A', isin: '1', ticker: 'A', quantity: 100, unitPrice: 5.50, fees: 0, ttf: 0, totalAmount: 550 },
        { id: '2', date: '2025-07-07', type: 'Achat', assetName: 'A', isin: '1', ticker: 'A', quantity: 100, unitPrice: 5.53, fees: 0, ttf: 0, totalAmount: 553 },
    ];

    const currentValue = 1200; // Mock current value
    const rate = calculateXIRR(transactions, currentValue);

    console.log(`Transactions: ${transactions.length}`);
    console.log(`Current Value: ${currentValue}`);
    console.log(`Calculated XIRR: ${(rate * 100).toFixed(4)}%`);
}

async function testPriceFetching() {
    console.log('\n--- Testing Price Fetching ---');
    const tickers = ['WPEA.PA', 'AAPL', 'MSFT'];

    for (const ticker of tickers) {
        try {
            const price = await priceProvider.getCurrentPrice(ticker);
            console.log(`${ticker}: $${price}`);
        } catch (error) {
            console.error(`Failed to fetch ${ticker}:`, error);
        }
    }
}

async function run() {
    await testXIRR();
    await testPriceFetching();
}

run();
