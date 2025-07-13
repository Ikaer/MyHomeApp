import fs from 'fs';
import path from 'path';
import { Bookmark, BookmarkCategory } from '@/types';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const BOOKMARKS_PATH = path.join(DATA_PATH, 'bookmarks');

// Enhanced logging function (imported from data.ts pattern)
function logToFile(level: 'INFO' | 'ERROR' | 'WARN', message: string, error?: any): void {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}${error ? ` - ${error.message || error}` : ''}\n`;
    
    const LOGS_PATH = process.env.LOGS_PATH || '/app/logs';
    if (!fs.existsSync(LOGS_PATH)) {
      fs.mkdirSync(LOGS_PATH, { recursive: true, mode: 0o755 });
    }
    
    const logFile = path.join(LOGS_PATH, 'app.log');
    fs.appendFileSync(logFile, logEntry);
    console.log(`${level}: ${message}`, error || '');
  } catch (logError) {
    console.error('Failed to write to log file:', logError);
    console.log(`${level}: ${message}`, error || '');
  }
}

// Ensure directory exists
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
  }
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Read JSON file with error handling
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (error) {
    logToFile('ERROR', `Error reading JSON file ${filePath}`, error);
    return defaultValue;
  }
}

// Write JSON file with error handling
function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    logToFile('ERROR', `Error writing JSON file ${filePath}`, error);
    return false;
  }
}

// Default categories
const defaultCategories: BookmarkCategory[] = [
  {
    id: 'work',
    name: 'Work',
    description: 'Work related bookmarks',
    color: '#3b82f6',
    icon: '💼'
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Personal bookmarks',
    color: '#10b981',
    icon: '👤'
  },
  {
    id: 'tools',
    name: 'Tools',
    description: 'Development and productivity tools',
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
    description: 'Documentation and references',
    color: '#8b5cf6',
    icon: '📚'
  }
];

// Get all bookmarks
export function getAllBookmarks(): Bookmark[] {
  try {
    ensureDirectoryExists(BOOKMARKS_PATH);
    const bookmarksFile = path.join(BOOKMARKS_PATH, 'bookmarks.json');
    const bookmarks = readJsonFile<Bookmark[]>(bookmarksFile, []);
    logToFile('INFO', `Retrieved ${bookmarks.length} bookmarks`);
    return bookmarks;
  } catch (error) {
    logToFile('ERROR', 'Failed to get all bookmarks', error);
    return [];
  }
}

// Get bookmark by ID
export function getBookmarkById(id: string): Bookmark | null {
  try {
    const bookmarks = getAllBookmarks();
    const bookmark = bookmarks.find(b => b.id === id) || null;
    if (bookmark) {
      logToFile('INFO', `Retrieved bookmark: ${bookmark.title}`);
    }
    return bookmark;
  } catch (error) {
    logToFile('ERROR', `Failed to get bookmark by ID: ${id}`, error);
    return null;
  }
}

// Create new bookmark
export function createBookmark(bookmarkData: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Bookmark | null {
  try {
    const bookmarks = getAllBookmarks();
    const now = new Date().toISOString();
    
    const newBookmark: Bookmark = {
      ...bookmarkData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    
    bookmarks.push(newBookmark);
    
    const bookmarksFile = path.join(BOOKMARKS_PATH, 'bookmarks.json');
    if (writeJsonFile(bookmarksFile, bookmarks)) {
      logToFile('INFO', `Created bookmark: ${newBookmark.title}`);
      return newBookmark;
    }
    
    return null;
  } catch (error) {
    logToFile('ERROR', 'Failed to create bookmark', error);
    return null;
  }
}

// Update bookmark
export function updateBookmark(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): Bookmark | null {
  try {
    const bookmarks = getAllBookmarks();
    const index = bookmarks.findIndex(b => b.id === id);
    
    if (index === -1) {
      logToFile('WARN', `Bookmark not found for update: ${id}`);
      return null;
    }
    
    bookmarks[index] = {
      ...bookmarks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const bookmarksFile = path.join(BOOKMARKS_PATH, 'bookmarks.json');
    if (writeJsonFile(bookmarksFile, bookmarks)) {
      logToFile('INFO', `Updated bookmark: ${bookmarks[index].title}`);
      return bookmarks[index];
    }
    
    return null;
  } catch (error) {
    logToFile('ERROR', `Failed to update bookmark: ${id}`, error);
    return null;
  }
}

// Delete bookmark
export function deleteBookmark(id: string): boolean {
  try {
    const bookmarks = getAllBookmarks();
    const index = bookmarks.findIndex(b => b.id === id);
    
    if (index === -1) {
      logToFile('WARN', `Bookmark not found for deletion: ${id}`);
      return false;
    }
    
    const deletedBookmark = bookmarks[index];
    bookmarks.splice(index, 1);
    
    const bookmarksFile = path.join(BOOKMARKS_PATH, 'bookmarks.json');
    if (writeJsonFile(bookmarksFile, bookmarks)) {
      logToFile('INFO', `Deleted bookmark: ${deletedBookmark.title}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logToFile('ERROR', `Failed to delete bookmark: ${id}`, error);
    return false;
  }
}

// Search bookmarks
export function searchBookmarks(query: string, category?: string): Bookmark[] {
  try {
    const bookmarks = getAllBookmarks();
    const searchTerm = query.toLowerCase();
    
    let filtered = bookmarks.filter(bookmark => {
      const matchesQuery = 
        bookmark.title.toLowerCase().includes(searchTerm) ||
        (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm)) ||
        bookmark.url.toLowerCase().includes(searchTerm) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
      const matchesCategory = !category || bookmark.category === category;
      
      return matchesQuery && matchesCategory;
    });
    
    // Sort by relevance (title matches first)
    filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(searchTerm);
      const bTitle = b.title.toLowerCase().includes(searchTerm);
      
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return a.title.localeCompare(b.title);
    });
    
    logToFile('INFO', `Search "${query}" returned ${filtered.length} results`);
    return filtered;
  } catch (error) {
    logToFile('ERROR', `Failed to search bookmarks: ${query}`, error);
    return [];
  }
}

// Get bookmarks by category
export function getBookmarksByCategory(category: string): Bookmark[] {
  try {
    const bookmarks = getAllBookmarks();
    const filtered = bookmarks.filter(b => b.category === category);
    logToFile('INFO', `Retrieved ${filtered.length} bookmarks for category: ${category}`);
    return filtered;
  } catch (error) {
    logToFile('ERROR', `Failed to get bookmarks by category: ${category}`, error);
    return [];
  }
}

// Get all categories
export function getAllCategories(): BookmarkCategory[] {
  try {
    ensureDirectoryExists(BOOKMARKS_PATH);
    const categoriesFile = path.join(BOOKMARKS_PATH, 'categories.json');
    const categories = readJsonFile<BookmarkCategory[]>(categoriesFile, defaultCategories);
    
    // Write default categories if file doesn't exist
    if (!fs.existsSync(categoriesFile)) {
      writeJsonFile(categoriesFile, defaultCategories);
    }
    
    logToFile('INFO', `Retrieved ${categories.length} categories`);
    return categories;
  } catch (error) {
    logToFile('ERROR', 'Failed to get categories', error);
    return defaultCategories;
  }
}

// Get category by ID
export function getCategoryById(id: string): BookmarkCategory | null {
  try {
    const categories = getAllCategories();
    const category = categories.find(c => c.id === id) || null;
    return category;
  } catch (error) {
    logToFile('ERROR', `Failed to get category by ID: ${id}`, error);
    return null;
  }
}

// Export data (for backup)
export function exportBookmarks(): { bookmarks: Bookmark[], categories: BookmarkCategory[] } {
  try {
    const bookmarks = getAllBookmarks();
    const categories = getAllCategories();
    logToFile('INFO', `Exported ${bookmarks.length} bookmarks and ${categories.length} categories`);
    return { bookmarks, categories };
  } catch (error) {
    logToFile('ERROR', 'Failed to export bookmarks', error);
    return { bookmarks: [], categories: [] };
  }
}

// Import data (from backup)
export function importBookmarks(data: { bookmarks: Bookmark[], categories?: BookmarkCategory[] }): boolean {
  try {
    const bookmarksFile = path.join(BOOKMARKS_PATH, 'bookmarks.json');
    const success = writeJsonFile(bookmarksFile, data.bookmarks);
    
    if (data.categories && data.categories.length > 0) {
      const categoriesFile = path.join(BOOKMARKS_PATH, 'categories.json');
      writeJsonFile(categoriesFile, data.categories);
    }
    
    if (success) {
      logToFile('INFO', `Imported ${data.bookmarks.length} bookmarks`);
    }
    
    return success;
  } catch (error) {
    logToFile('ERROR', 'Failed to import bookmarks', error);
    return false;
  }
}
