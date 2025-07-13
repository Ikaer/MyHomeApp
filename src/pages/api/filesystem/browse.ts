import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';

export interface FileSystemItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  extension?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { rootPath, relativePath = '' } = req.body;

    if (!rootPath) {
      return res.status(400).json({ error: 'Root path is required' });
    }

    // Construct the full path
    const fullPath = path.join(rootPath, relativePath);
    
    // Security check: ensure the path is within the root
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(rootPath);
    
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return res.status(403).json({ error: 'Access denied: path outside root' });
    }

    // Check if path exists
    try {
      await fs.access(resolvedPath);
    } catch (error) {
      return res.status(404).json({ error: 'Path not found' });
    }

    // Get directory contents
    const items = await fs.readdir(resolvedPath, { withFileTypes: true });
    const fileSystemItems: FileSystemItem[] = [];

    for (const item of items) {
      try {
        const itemPath = path.join(resolvedPath, item.name);
        const stats = await fs.stat(itemPath);
        const relativItemPath = path.relative(rootPath, itemPath).replace(/\\/g, '/');
        
        // Skip hidden files/folders (starting with .)
        if (item.name.startsWith('.')) {
          continue;
        }

        const fileSystemItem: FileSystemItem = {
          path: '/' + relativItemPath,
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          modified: stats.mtime.toISOString(),
        };

        if (item.isFile()) {
          fileSystemItem.size = stats.size;
          const ext = path.extname(item.name).toLowerCase().slice(1);
          if (ext) {
            fileSystemItem.extension = ext;
          }
        }

        fileSystemItems.push(fileSystemItem);
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Skipping ${item.name}: ${error}`);
        continue;
      }
    }

    // Sort: directories first, then files, both alphabetically
    fileSystemItems.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({ items: fileSystemItems });
  } catch (error) {
    console.error('File system API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
