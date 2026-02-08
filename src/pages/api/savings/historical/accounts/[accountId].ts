import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getSavingsAccount } from '@/lib/savings';
import { readJsonFile } from '@/lib/data';

interface HistoricalAccountRecord {
  timestamp: string;
  accountId: string;
  accountName: string;
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  xirr: number;
  currentYearXirr: number;
}

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const HISTORICAL_ACCOUNTS_DIR = path.join(DATA_PATH, 'savings', 'historical', 'accounts');

function sanitizeFileSegment(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const dashed = trimmed.replace(/\s+/g, '-');
  const safe = dashed.replace(/[^a-z0-9_-]/g, '');
  return safe || 'unknown';
}

function getAccountFilePath(accountName: string, accountId: string): string {
  const base = sanitizeFileSegment(accountName || accountId || 'unknown');
  return path.join(HISTORICAL_ACCOUNTS_DIR, `${base}.json`);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accountId } = req.query;

  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ error: 'Invalid account ID' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const account = getSavingsAccount(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const filePath = getAccountFilePath(account.name, account.id);
  const records = readJsonFile<HistoricalAccountRecord[]>(filePath, []);
  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return res.status(200).json(records);
}
