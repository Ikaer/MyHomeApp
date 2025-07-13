import { NextApiRequest, NextApiResponse } from 'next';
import { getAllBookmarks, createBookmark } from '@/lib/bookmarks';
import { Bookmark } from '@/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { category, search } = req.query;
        
        let bookmarks = getAllBookmarks();
        
        // Filter by category if provided
        if (category && typeof category === 'string') {
          bookmarks = bookmarks.filter(b => b.category === category);
        }
        
        // Filter by search term if provided
        if (search && typeof search === 'string') {
          const searchTerm = search.toLowerCase();
          bookmarks = bookmarks.filter(b => 
            b.title.toLowerCase().includes(searchTerm) ||
            (b.description && b.description.toLowerCase().includes(searchTerm)) ||
            b.url.toLowerCase().includes(searchTerm) ||
            b.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        }
        
        // Sort by updated date (newest first)
        bookmarks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        res.status(200).json({ bookmarks });
        break;
        
      case 'POST':
        const { title, url, description, category: newCategory, tags } = req.body;
        
        if (!title || !url || !newCategory) {
          return res.status(400).json({ 
            error: 'Title, URL, and category are required' 
          });
        }
        
        const newBookmark = createBookmark({
          title,
          url,
          description: description || '',
          category: newCategory,
          tags: tags || []
        });
        
        if (newBookmark) {
          res.status(201).json({ bookmark: newBookmark });
        } else {
          res.status(500).json({ error: 'Failed to create bookmark' });
        }
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
