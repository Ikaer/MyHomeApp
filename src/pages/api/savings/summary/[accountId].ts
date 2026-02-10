import { NextApiRequest, NextApiResponse } from 'next';
import {
    getAccountSummary,
    getTransactions,
    calculateAccountPositions,
    getSavingsAccount,
    getAccountValuation
} from '@/lib/savings';
import { fetchCurrentPrices } from '@/lib/finance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
        const account = getSavingsAccount(accountId);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // For PEA accounts, return the full positions-based summary
        if (account.type === 'PEA') {
            const transactions = getTransactions(accountId);
            const tickers = Array.from(new Set(transactions.map(t => t.ticker)));
            const currentPrices = await fetchCurrentPrices(tickers);
            const summary = getAccountSummary(accountId, currentPrices);
            const positions = calculateAccountPositions(accountId, currentPrices);

            if (!summary) {
                return res.status(404).json({ error: 'Account not found' });
            }

            return res.status(200).json({ summary, positions });
        }

        // For all other account types, return the unified valuation
        const valuation = await getAccountValuation(account);
        return res.status(200).json({
            summary: {
                accountId: valuation.accountId,
                totalInvested: valuation.totalContributed,
                currentValue: valuation.currentValue,
                totalGainLoss: valuation.totalGainLoss,
                xirr: 0,
            },
            positions: [],
            valuation,
        });
    } catch (error) {
        console.error('Error fetching account summary:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
