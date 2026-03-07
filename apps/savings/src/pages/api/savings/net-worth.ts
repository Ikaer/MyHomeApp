import { NextApiRequest, NextApiResponse } from 'next';
import { getNetWorthWithCurrentPrices } from '@/lib/savings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const netWorth = await getNetWorthWithCurrentPrices();
        return res.status(200).json(netWorth);
    } catch (error) {
        console.error('Error computing net worth:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
