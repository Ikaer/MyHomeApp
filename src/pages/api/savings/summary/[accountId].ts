import { NextApiRequest, NextApiResponse } from 'next';
import { getAccountSummary, getTransactions, calculateAccountPositions } from '@/lib/savings';
import { fetchCurrentPrices } from '@/lib/finance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
        const transactions = getTransactions(accountId);
        const tickers = Array.from(new Set(transactions.map(t => t.ticker)));

        // Fetch current prices
        const currentPrices = await fetchCurrentPrices(tickers);

        const summary = getAccountSummary(accountId, currentPrices);
        const positions = calculateAccountPositions(accountId, currentPrices);

        if (!summary) {
            return res.status(404).json({ error: 'Account not found' });
        }

        return res.status(200).json({
            summary,
            positions
        });
    } catch (error) {
        console.error('Error fetching account summary:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
