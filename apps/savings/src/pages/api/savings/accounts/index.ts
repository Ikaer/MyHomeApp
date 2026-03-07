import { NextApiRequest, NextApiResponse } from 'next';
import { getAllSavingsAccounts, saveSavingsAccount, setDefaultSavingsAccount } from '@/lib/savings';
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

    if (req.method === 'PATCH') {
        const { accountId } = req.body as { accountId?: string };
        if (!accountId) {
            return res.status(400).json({ error: 'Missing account ID' });
        }

        const updated = setDefaultSavingsAccount(accountId);
        if (!updated) {
            return res.status(404).json({ error: 'Account not found or failed to update' });
        }

        return res.status(200).json(updated);
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
