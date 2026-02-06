import yahooFinance from 'yahoo-finance2';
import * as yfModule from 'yahoo-finance2';

console.log('Default export type:', typeof yahooFinance);
console.log('Module keys:', Object.keys(yfModule));

try {
    console.log('Trying new yahooFinance()...');
    const yf = new (yahooFinance as any)();
    console.log('Success!');
} catch (e) {
    console.log('Failed to instantiate default:', (e as any).message);
}

try {
    console.log('Trying new yfModule.YahooFinance()...');
    const yf = new (yfModule as any).YahooFinance();
    console.log('Success!');
} catch (e) {
    console.log('Failed to instantiate yfModule.YahooFinance:', (e as any).message);
}

async function testQuote() {
    try {
        console.log('Trying direct quote...');
        const quote = await (yahooFinance as any).quote('AAPL');
        console.log('Success:', quote.regularMarketPrice);
    } catch (e) {
        console.log('Failed direct quote:', (e as any).message);
    }
}

testQuote();
