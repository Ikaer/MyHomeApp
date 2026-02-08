import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import {
  getAllSavingsAccounts,
  getAccountSummary,
  getTransactions,
  calculateCurrentYearXIRR
} from '@/lib/savings';
import { fetchCurrentPrices } from '@/lib/finance';
import { ensureDirectoryExists, readJsonFile, writeJsonFile } from '@/lib/data';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const accounts = getAllSavingsAccounts();
    const allTransactions = accounts.flatMap(account => getTransactions(account.id));
    const allTickers = Array.from(new Set(allTransactions.map(t => t.ticker)));
    const currentPrices = await fetchCurrentPrices(allTickers);

    ensureDirectoryExists(HISTORICAL_ACCOUNTS_DIR);
    const timestamp = new Date().toISOString();
    let writtenCount = 0;

    accounts.forEach(account => {
      const summary = getAccountSummary(account.id, currentPrices);
      if (!summary) return;

      const currentYearXirr = calculateCurrentYearXIRR(account.id, summary.currentValue);

      const record: HistoricalAccountRecord = {
        timestamp,
        accountId: account.id,
        accountName: account.name,
        totalInvested: summary.totalInvested,
        currentValue: summary.currentValue,
        totalGainLoss: summary.totalGainLoss,
        xirr: summary.xirr,
        currentYearXirr
      };

      const filePath = getAccountFilePath(account.name, account.id);
      const existing = readJsonFile<HistoricalAccountRecord[]>(filePath, []);
      existing.push(record);

      if (writeJsonFile(filePath, existing)) {
        writtenCount += 1;
      }
    });

    return res.status(200).json({
      message: 'Account values stored successfully',
      accountCount: writtenCount,
      timestamp
    });
  } catch (error) {
    console.error('Error storing historical account values:', error);
    return res.status(500).json({
      error: 'Failed to store historical account values',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
