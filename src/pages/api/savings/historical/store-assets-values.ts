import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { calculateAccountPositions, getAllSavingsAccounts, getTransactions } from '@/lib/savings';
import { fetchCurrentPrices } from '@/lib/finance';
import { ensureDirectoryExists, readJsonFile, writeJsonFile } from '@/lib/data';

interface HistoricalAssetRecord {
  timestamp: string;
  isin: string;
  ticker: string;
  name: string;
  quantity: number;
  averagePurchasePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number;
}

interface AggregatedAsset {
  isin: string;
  ticker: string;
  name: string;
  quantity: number;
  totalInvested: number;
  currentValue: number;
}

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const HISTORICAL_ASSETS_DIR = path.join(DATA_PATH, 'savings', 'historical', 'assets');

function sanitizeFileSegment(value: string): string {
  const trimmed = value.trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || 'unknown';
}

function getAssetFilePath(isin: string, ticker: string): string {
  const base = sanitizeFileSegment(isin || ticker || 'unknown');
  return path.join(HISTORICAL_ASSETS_DIR, `${base}.json`);
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
    const transactionsByAccount = accounts.map(account => ({
      accountId: account.id,
      transactions: getTransactions(account.id)
    }));

    const allTickers = Array.from(
      new Set(transactionsByAccount.flatMap(entry => entry.transactions.map(t => t.ticker)))
    );

    const currentPrices = await fetchCurrentPrices(allTickers);
    const aggregated: Record<string, AggregatedAsset> = {};

    transactionsByAccount.forEach(entry => {
      const positions = calculateAccountPositions(entry.accountId, currentPrices);
      positions.forEach(pos => {
        const key = pos.isin || pos.ticker;
        if (!key) return;

        if (!aggregated[key]) {
          aggregated[key] = {
            isin: pos.isin || key,
            ticker: pos.ticker,
            name: pos.name,
            quantity: 0,
            totalInvested: 0,
            currentValue: 0
          };
        }

        aggregated[key].quantity += pos.quantity;
        aggregated[key].totalInvested += pos.totalInvested;
        aggregated[key].currentValue += pos.currentValue;
      });
    });

    ensureDirectoryExists(HISTORICAL_ASSETS_DIR);
    const timestamp = new Date().toISOString();
    let writtenCount = 0;

    Object.values(aggregated).forEach(asset => {
      const averagePurchasePrice = asset.quantity > 0 ? asset.totalInvested / asset.quantity : 0;
      const currentPrice = asset.quantity > 0 ? asset.currentValue / asset.quantity : 0;
      const unrealizedGainLoss = asset.currentValue - asset.totalInvested;
      const unrealizedGainLossPercentage = asset.totalInvested > 0
        ? (unrealizedGainLoss / asset.totalInvested) * 100
        : 0;

      const record: HistoricalAssetRecord = {
        timestamp,
        isin: asset.isin,
        ticker: asset.ticker,
        name: asset.name,
        quantity: asset.quantity,
        averagePurchasePrice,
        totalInvested: asset.totalInvested,
        currentPrice,
        currentValue: asset.currentValue,
        unrealizedGainLoss,
        unrealizedGainLossPercentage
      };

      const filePath = getAssetFilePath(asset.isin, asset.ticker);
      const existing = readJsonFile<HistoricalAssetRecord[]>(filePath, []);
      existing.push(record);

      if (writeJsonFile(filePath, existing)) {
        writtenCount += 1;
      }
    });

    return res.status(200).json({
      message: 'Asset values stored successfully',
      assetCount: writtenCount,
      timestamp
    });
  } catch (error) {
    console.error('Error storing historical asset values:', error);
    return res.status(500).json({
      error: 'Failed to store historical asset values',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
