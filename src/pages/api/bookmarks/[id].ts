import { NextApiRequest, NextApiResponse } from 'next';
import { getBookmarkById, updateBookmark, deleteBookmark } from '@/lib/bookmarks';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid bookmark ID' });
    }
    
    switch (req.method) {
      case 'GET':
        const bookmark = getBookmarkById(id);
        if (bookmark) {
          res.status(200).json({ bookmark });
        } else {
          res.status(404).json({ error: 'Bookmark not found' });
        }
        break;
        
      case 'PUT':
        const { title, url, description, category, tags } = req.body;
        
        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (url !== undefined) updates.url = url;
        if (description !== undefined) updates.description = description;
        if (category !== undefined) updates.category = category;
        if (tags !== undefined) updates.tags = tags;
        
        const updatedBookmark = updateBookmark(id, updates);
        if (updatedBookmark) {
          res.status(200).json({ bookmark: updatedBookmark });
        } else {
          res.status(404).json({ error: 'Bookmark not found' });
        }
        break;
        
      case 'DELETE':
        const deleted = deleteBookmark(id);
        if (deleted) {
          res.status(200).json({ message: 'Bookmark deleted successfully' });
        } else {
          res.status(404).json({ error: 'Bookmark not found' });
        }
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
