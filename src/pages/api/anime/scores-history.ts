import { NextApiRequest, NextApiResponse } from 'next';
import { getAnimeScoresHistory } from '@/lib/anime';

// Reverted to original simple implementation per user request.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const history = getAnimeScoresHistory();
      res.status(200).json({ history });
    } catch (error) {
      console.error('Error fetching scores history:', error);
      res.status(500).json({ error: 'Failed to fetch scores history' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
