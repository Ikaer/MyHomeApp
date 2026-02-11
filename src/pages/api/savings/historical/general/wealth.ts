import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { readJsonFile } from '@/lib/data';

interface HistoricalWealthRecord {
  timestamp: string;
  total: number;
  accountsCount: number;
}

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const WEALTH_FILE = path.join(DATA_PATH, 'savings', 'historical', 'general', 'wealth.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const records = readJsonFile<HistoricalWealthRecord[]>(WEALTH_FILE, []);
  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return res.status(200).json(records);
}
