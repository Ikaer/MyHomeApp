import { NextApiRequest, NextApiResponse } from 'next';
import {
    getBalanceRecords,
    addBalanceRecord,
    getSavingsAccount
} from '@/lib/savings';
import { BalanceRecord } from '@/models/savings';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    const account = getSavingsAccount(accountId);
    if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }

    if (req.method === 'GET') {
        const records = getBalanceRecords(accountId);
        return res.status(200).json(records);
    }

    if (req.method === 'POST') {
        const { date, balance } = req.body as Partial<BalanceRecord>;

        if (!date || balance === undefined || balance === null) {
            return res.status(400).json({ error: 'Missing date or balance' });
        }

        const record: BalanceRecord = { date, balance: Number(balance) };
        const success = addBalanceRecord(accountId, record);

        if (!success) {
            return res.status(500).json({ error: 'Failed to save balance record' });
        }

        return res.status(201).json(record);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
