import { NextApiRequest, NextApiResponse } from 'next';
import { exportBookmarks, importBookmarks, getAllCategories } from '@/lib/bookmarks';
import { parseBookmarkFile } from '@/lib/importBookmarks';

// Configure body parser to handle large bookmark files (up to 10MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // Export bookmarks
        const data = exportBookmarks();
        res.status(200).json(data);
        break;
        
      case 'POST':
        // Import bookmarks - can be JSON or HTML
        const { bookmarks, categories, fileContent, fileName } = req.body;
        
        let importData: { bookmarks: any[], categories?: any[] };
        
        if (fileContent && fileName) {
          // Parse file content (HTML or JSON)
          try {
            importData = parseBookmarkFile(fileContent, fileName);
            
            // Merge with existing categories if HTML import doesn't have categories
            if (!importData.categories || importData.categories.length === 0) {
              importData.categories = getAllCategories();
            }
          } catch (parseError: any) {
            console.error('Parse error:', parseError);
            return res.status(400).json({ 
              error: `Failed to parse bookmark file: ${parseError?.message || 'Unknown error'}` 
            });
          }
        } else {
          // Legacy JSON format
          if (!bookmarks || !Array.isArray(bookmarks)) {
            return res.status(400).json({ error: 'Invalid bookmarks data' });
          }
          importData = { bookmarks, categories };
        }
        
        const success = importBookmarks(importData);
        if (success) {
          res.status(200).json({ 
            message: 'Bookmarks imported successfully',
            imported: importData.bookmarks.length,
            categories: importData.categories?.length || 0
          });
        } else {
          res.status(500).json({ error: 'Failed to import bookmarks' });
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
