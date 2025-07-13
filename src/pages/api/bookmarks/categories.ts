import { NextApiRequest, NextApiResponse } from 'next';
import { getAllCategories } from '@/lib/bookmarks';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const categories = getAllCategories();
        res.status(200).json({ categories });
        break;
        
      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
