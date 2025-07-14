import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';
import type { FileRoot } from '@/models/files';

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data');
const FILES_DATA_PATH = path.join(DATA_PATH, 'files');
const DATA_FILE = path.join(FILES_DATA_PATH, 'file-roots.json');

async function readFileRoots(): Promise<FileRoot[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeFileRoots(roots: FileRoot[]): Promise<void> {
  await fs.mkdir(FILES_DATA_PATH, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(roots, null, 2));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const roots = await readFileRoots();
    const rootIndex = roots.findIndex(root => root.id === id);

    switch (req.method) {
      case 'GET':
        if (rootIndex === -1) {
          return res.status(404).json({ error: 'File root not found' });
        }
        res.status(200).json(roots[rootIndex]);
        break;

      case 'PUT':
        if (rootIndex === -1) {
          return res.status(404).json({ error: 'File root not found' });
        }

        const { name, path: rootPath, description } = req.body;
        
        if (!name || !rootPath) {
          return res.status(400).json({ 
            error: 'Name and path are required' 
          });
        }

        // Check if path conflicts with another root
        const conflictingRoot = roots.find(
          root => root.path === rootPath.trim() && root.id !== id
        );
        if (conflictingRoot) {
          return res.status(400).json({ 
            error: 'A file root with this path already exists' 
          });
        }

        roots[rootIndex] = {
          ...roots[rootIndex],
          name: name.trim(),
          path: rootPath.trim(),
          description: description?.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };

        await writeFileRoots(roots);
        res.status(200).json(roots[rootIndex]);
        break;

      case 'DELETE':
        if (rootIndex === -1) {
          return res.status(404).json({ error: 'File root not found' });
        }

        roots.splice(rootIndex, 1);
        await writeFileRoots(roots);
        res.status(204).end();
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('File root API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
