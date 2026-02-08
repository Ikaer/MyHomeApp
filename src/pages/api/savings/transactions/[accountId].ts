import { NextApiRequest, NextApiResponse } from 'next';
import { getTransactions, addTransaction, updateTransaction } from '@/lib/savings';
import { Transaction } from '@/models/savings';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    if (req.method === 'GET') {
        const transactions = getTransactions(accountId);
        return res.status(200).json(transactions);
    }

    if (req.method === 'POST') {
        const transaction: Transaction = req.body;
        if (!transaction.id || !transaction.ticker) {
            return res.status(400).json({ error: 'Missing transaction data' });
        }

        const success = addTransaction(accountId, transaction);
        if (!success) {
            return res.status(500).json({ error: 'Failed to add transaction' });
        }

        return res.status(201).json(transaction);
    }

    if (req.method === 'PUT') {
        const transaction: Transaction = req.body;
        if (!transaction.id || !transaction.ticker) {
            return res.status(400).json({ error: 'Missing transaction data' });
        }

        const success = updateTransaction(accountId, transaction);
        if (!success) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(200).json(transaction);
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
