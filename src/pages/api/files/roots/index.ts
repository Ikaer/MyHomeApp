import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';
import type { FileRoot } from '@/models/files';

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data');
const FILES_DATA_PATH = path.join(DATA_PATH, 'files');
const DATA_FILE = path.join(FILES_DATA_PATH, 'file-roots.json');

async function ensureDataFile() {
  try {
    // Ensure files data directory exists
    await fs.mkdir(FILES_DATA_PATH, { recursive: true });
    
    // Check if file exists
    await fs.access(DATA_FILE);
  } catch (error) {
    // File doesn't exist, create with empty array
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
  }
}

async function readFileRoots(): Promise<FileRoot[]> {
  await ensureDataFile();
  const data = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeFileRoots(roots: FileRoot[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(roots, null, 2));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const roots = await readFileRoots();
        res.status(200).json(roots);
        break;

      case 'POST':
        const { name, path: rootPath, description } = req.body;
        
        if (!name || !rootPath) {
          return res.status(400).json({ 
            error: 'Name and path are required' 
          });
        }

        const existingRoots = await readFileRoots();
        
        // Check if path already exists
        if (existingRoots.some(root => root.path === rootPath)) {
          return res.status(400).json({ 
            error: 'A file root with this path already exists' 
          });
        }

        const newRoot: FileRoot = {
          id: Date.now().toString(), // Simple ID generation
          name: name.trim(),
          path: rootPath.trim(),
          description: description?.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        existingRoots.push(newRoot);
        await writeFileRoots(existingRoots);
        
        res.status(201).json(newRoot);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('File roots API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
