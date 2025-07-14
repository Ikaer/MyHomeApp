import { NextApiRequest, NextApiResponse } from 'next';
import { getSubApps } from '@/lib/data';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subApps = getSubApps();
    res.status(200).json({ subApps });
  } catch (error) {
    console.error('Error fetching subapps:', error);
    res.status(500).json({ error: 'Failed to fetch subapps' });
  }
}
