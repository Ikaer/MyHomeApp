import { NextApiRequest, NextApiResponse } from 'next';
import { storeHistoricalAccountsValues } from '@/lib/savings';

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
    const { accountCount, timestamp } = await storeHistoricalAccountsValues();

    return res.status(200).json({
      message: 'Account values stored successfully',
      accountCount,
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
