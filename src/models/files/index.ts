/**
 * File system related interfaces and types
 */

export interface FileSystemItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  extension?: string;
}

export interface FileRoot {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryContents {
  items: FileSystemItem[];
  total: number;
  path: string;
}

export interface FilePreview {
  content: string;
  type: 'text' | 'image' | 'binary';
  encoding?: string;
}
