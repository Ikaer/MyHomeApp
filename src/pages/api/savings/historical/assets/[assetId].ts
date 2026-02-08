import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { readJsonFile } from '@/lib/data';

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

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const HISTORICAL_ASSETS_DIR = path.join(DATA_PATH, 'savings', 'historical', 'assets');

function sanitizeFileSegment(value: string): string {
  const trimmed = value.trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || 'unknown';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { assetId } = req.query;

  if (!assetId || typeof assetId !== 'string') {
    return res.status(400).json({ error: 'Invalid asset ID' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const fileName = `${sanitizeFileSegment(assetId)}.json`;
  const filePath = path.join(HISTORICAL_ASSETS_DIR, fileName);
  const records = readJsonFile<HistoricalAssetRecord[]>(filePath, []);
  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return res.status(200).json(records);
}
