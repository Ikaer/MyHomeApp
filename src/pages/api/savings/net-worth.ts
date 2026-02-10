import { NextApiRequest, NextApiResponse } from 'next';
import { getNetWorth, getTransactions, getAllSavingsAccounts } from '@/lib/savings';
import { fetchCurrentPrices } from '@/lib/finance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        // Gather tickers from all PEA accounts for price fetching
        const accounts = getAllSavingsAccounts();
        const peaAccounts = accounts.filter(a => a.type === 'PEA');
        const allTickers = new Set<string>();

        for (const pea of peaAccounts) {
            const transactions = getTransactions(pea.id);
            transactions.forEach(t => allTickers.add(t.ticker));
        }

        const currentPrices = allTickers.size > 0
            ? await fetchCurrentPrices(Array.from(allTickers))
            : {};

        const netWorth = await getNetWorth(currentPrices);
        return res.status(200).json(netWorth);
    } catch (error) {
        console.error('Error computing net worth:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
