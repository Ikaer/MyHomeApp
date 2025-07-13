import { Bookmark, BookmarkCategory } from '@/types';

// Parse Chrome HTML bookmark export (server-side version)
export function parseHTMLBookmarks(htmlContent: string): { bookmarks: Bookmark[], categories: BookmarkCategory[] } {
  try {
    const bookmarks: Bookmark[] = [];
    
    // Create default categories instead of mapping from Chrome folders
    const defaultCategories: BookmarkCategory[] = [
      {
        id: 'personal',
        name: 'Personal',
        description: 'Personal bookmarks',
        color: '#10b981',
        icon: '👤'
      },
      {
        id: 'work',
        name: 'Work',
        description: 'Work-related bookmarks',
        color: '#3b82f6',
        icon: '💼'
      },
      {
        id: 'tools',
        name: 'Tools',
        description: 'Development tools and utilities',
        color: '#f59e0b',
        icon: '🔧'
      },
      {
        id: 'entertainment',
        name: 'Entertainment',
        description: 'Entertainment and media',
        color: '#ef4444',
        icon: '🎮'
      },
      {
        id: 'reference',
        name: 'Reference',
        description: 'Reference materials and documentation',
        color: '#8b5cf6',
        icon: '📚'
      }
    ];
    
    // Track folder hierarchy for path building
    const folderStack: string[] = [];
    let currentDepth = 0;
    
    // Split content into lines to process folders and bookmarks in order
    const lines = htmlContent.split('\n');
    let index = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for folder start
      const folderMatch = line.match(/<DT><H3[^>]*>([^<]+)<\/H3>/);
      if (folderMatch) {
        const folderName = folderMatch[1].trim();
        
        // Determine depth by looking at the next lines for <DL><p>
        let depth = 0;
        for (let j = i + 1; j < lines.length && j < i + 5; j++) {
          if (lines[j].includes('<DL><p>')) {
            depth = (lines[j].match(/<DL>/g) || []).length;
            break;
          }
        }
        
        // Adjust folder stack based on depth
        if (depth > currentDepth) {
          folderStack.push(folderName);
        } else if (depth === currentDepth) {
          folderStack[folderStack.length - 1] = folderName;
        } else {
          // Going back up the hierarchy
          const diff = currentDepth - depth;
          for (let k = 0; k < diff + 1; k++) {
            folderStack.pop();
          }
          folderStack.push(folderName);
        }
        
        currentDepth = depth;
        continue;
      }
      
      // Check for bookmarks
      const bookmarkMatch = line.match(/<DT><A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/);
      if (bookmarkMatch) {
        const url = bookmarkMatch[1];
        const title = bookmarkMatch[2].trim();
        
        // Skip if it's not a valid URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) continue;
        
        // Build the full folder path
        const folderPath = folderStack.length > 0 ? folderStack.join(' / ') : '';
        
        // Assign default category based on folder name or URL
        let categoryId = 'personal'; // Default category
        
        // Simple heuristics for category assignment
        const lowerPath = folderPath.toLowerCase();
        const lowerTitle = title.toLowerCase();
        const lowerUrl = url.toLowerCase();
        
        if (lowerPath.includes('work') || lowerPath.includes('business') || lowerPath.includes('boulot')) {
          categoryId = 'work';
        } else if (lowerPath.includes('tool') || lowerPath.includes('dev') || lowerUrl.includes('github') || lowerUrl.includes('stackoverflow')) {
          categoryId = 'tools';
        } else if (lowerPath.includes('entertainment') || lowerPath.includes('fun') || lowerPath.includes('game') || lowerPath.includes('anime') || lowerPath.includes('music') || lowerPath.includes('youtube') || lowerPath.includes('netflix')) {
          categoryId = 'entertainment';
        } else if (lowerPath.includes('reference') || lowerPath.includes('doc') || lowerPath.includes('learn')) {
          categoryId = 'reference';
        }
        
        // Generate tags based on URL domain and folder
        const tags: string[] = [];
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace('www.', '');
          const domainParts = domain.split('.');
          if (domainParts.length > 1) {
            tags.push(domainParts[0]); // Add domain name as tag
          }
        } catch (e) {
          // Ignore invalid URLs
        }
        
        // Add folder name as tag if it exists
        if (folderStack.length > 0) {
          const lastFolder = folderStack[folderStack.length - 1];
          if (lastFolder && !tags.includes(lastFolder.toLowerCase())) {
            tags.push(lastFolder.toLowerCase().replace(/\s+/g, '-'));
          }
        }
        
        const now = new Date().toISOString();
        
        // Extract ADD_DATE if present
        const addDateMatch = line.match(/ADD_DATE="(\d+)"/);
        const createdAt = addDateMatch ? new Date(parseInt(addDateMatch[1]) * 1000).toISOString() : now;
        
        const bookmark: Bookmark = {
          id: `imported-${Date.now()}-${index++}`,
          title,
          url,
          description: '',
          category: categoryId,
          path: folderPath, // Store the Chrome folder path
          tags,
          createdAt,
          updatedAt: now
        };
        
        bookmarks.push(bookmark);
      }
    }
    
    return {
      bookmarks,
      categories: defaultCategories
    };
  } catch (error) {
    console.error('Error parsing HTML bookmarks:', error);
    throw new Error('Failed to parse HTML bookmark file');
  }
}

// Parse JSON bookmark export (existing format)
export function parseJSONBookmarks(jsonContent: string): { bookmarks: Bookmark[], categories?: BookmarkCategory[] } {
  try {
    const data = JSON.parse(jsonContent);
    
    // Validate the JSON structure
    if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
      throw new Error('Invalid JSON format: missing bookmarks array');
    }
    
    return {
      bookmarks: data.bookmarks,
      categories: data.categories || []
    };
  } catch (error) {
    console.error('Error parsing JSON bookmarks:', error);
    throw new Error('Failed to parse JSON bookmark file');
  }
}

// Auto-detect file type and parse accordingly
export function parseBookmarkFile(content: string, filename: string): { bookmarks: Bookmark[], categories?: BookmarkCategory[] } {
  const isHTML = filename.toLowerCase().endsWith('.html') || 
                 filename.toLowerCase().endsWith('.htm') || 
                 content.trim().startsWith('<!DOCTYPE') ||
                 content.trim().startsWith('<html') ||
                 content.includes('<DT><A HREF='); // Chrome bookmark specific
  
  if (isHTML) {
    return parseHTMLBookmarks(content);
  } else {
    return parseJSONBookmarks(content);
  }
}
