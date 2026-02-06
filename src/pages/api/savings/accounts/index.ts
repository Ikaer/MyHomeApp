import { NextApiRequest, NextApiResponse } from 'next';
import { getAllSavingsAccounts, saveSavingsAccount } from '@/lib/savings';
import { SavingsAccount } from '@/models/savings';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const accounts = getAllSavingsAccounts();
        return res.status(200).json(accounts);
    }

    if (req.method === 'POST') {
        const account: SavingsAccount = req.body;
        if (!account.id || !account.name) {
            return res.status(400).json({ error: 'Missing account ID or name' });
        }

        const success = saveSavingsAccount(account);
        if (!success) {
            return res.status(500).json({ error: 'Failed to save account' });
        }

        return res.status(201).json(account);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
