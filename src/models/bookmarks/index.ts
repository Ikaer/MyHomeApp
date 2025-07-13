/**
 * Bookmark-related interfaces and types
 */

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  path?: string; // Chrome bookmark folder path (e.g., "Bookmarks Bar/Work/Tools")
  favicon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
}

export interface BookmarkTreeNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNode[];
  type: 'folder' | 'bookmark';
}

export interface BookmarkImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
