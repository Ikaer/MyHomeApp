import { NextApiRequest, NextApiResponse } from 'next';
import { getAnnualAccountValues, saveAnnualAccountValues } from '@/lib/savings';
import { AnnualAccountValue } from '@/models/savings';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || Array.isArray(accountId)) {
        return res.status(400).json({ error: 'Invalid account ID' });
    }

    if (req.method === 'GET') {
        const values = getAnnualAccountValues(accountId);
        return res.status(200).json(values);
    }

    if (req.method === 'PUT') {
        const payload = req.body as AnnualAccountValue;
        if (!payload?.year || payload.endValue === undefined) {
            return res.status(400).json({ error: 'Missing year or end value' });
        }

        const values = getAnnualAccountValues(accountId);
        const existingIndex = values.findIndex(v => v.year === payload.year);
        const updatedEntry: AnnualAccountValue = {
            year: payload.year,
            endValue: payload.endValue,
            endDate: payload.endDate
        };

        if (existingIndex >= 0) {
            values[existingIndex] = updatedEntry;
        } else {
            values.push(updatedEntry);
        }

        values.sort((a, b) => a.year - b.year);

        const success = saveAnnualAccountValues(accountId, values);
        if (!success) {
            return res.status(500).json({ error: 'Failed to save annual values' });
        }

        return res.status(200).json(values);
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
