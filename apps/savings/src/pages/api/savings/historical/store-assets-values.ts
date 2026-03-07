import { NextApiRequest, NextApiResponse } from 'next';
import { storeHistoricalAssetsValues } from '@/lib/savings';

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
    const { assetCount, timestamp } = await storeHistoricalAssetsValues();

    return res.status(200).json({
      message: 'Asset values stored successfully',
      assetCount,
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
