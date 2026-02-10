import { NextApiRequest, NextApiResponse } from 'next';
import {
    getDepositRecords,
    addOrUpdateDeposit,
    deleteDeposit,
    getSavingsAccount
} from '@/lib/savings';
import { DepositRecord } from '@/models/savings';

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
        const records = getDepositRecords(accountId);
        return res.status(200).json(records);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        const deposit = req.body as Partial<DepositRecord>;

        if (!deposit.id || !deposit.deposit_date || deposit.deposit_amount === undefined) {
            return res.status(400).json({ error: 'Missing required fields: id, deposit_date, deposit_amount' });
        }

        const record: DepositRecord = {
            id: deposit.id,
            deposit_date: deposit.deposit_date,
            deposit_amount: Number(deposit.deposit_amount),
            strategy: deposit.strategy || '',
            lock_end_date: deposit.lock_end_date || '',
            current_value: Number(deposit.current_value ?? deposit.deposit_amount),
            value_date: deposit.value_date || deposit.deposit_date,
        };

        const success = addOrUpdateDeposit(accountId, record);
        if (!success) {
            return res.status(500).json({ error: 'Failed to save deposit' });
        }

        return res.status(req.method === 'POST' ? 201 : 200).json(record);
    }

    if (req.method === 'DELETE') {
        const { depositId } = req.body as { depositId?: string };
        if (!depositId) {
            return res.status(400).json({ error: 'Missing depositId' });
        }

        const success = deleteDeposit(accountId, depositId);
        if (!success) {
            return res.status(404).json({ error: 'Deposit not found' });
        }

        return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
