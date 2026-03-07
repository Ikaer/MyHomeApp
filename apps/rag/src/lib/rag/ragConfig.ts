/**
 * RAG configuration — reads and writes data/rag/config.json.
 *
 * The config file is the single source of truth for:
 * - which directories to index
 * - which categories to assign to files in each directory
 * - collection name
 * - ingestion schedule
 */

import fs from 'fs';
import path from 'path';
import type { RagConfig, RagSource } from '@/models/rag';
import { ensureDirectoryExists } from '@myhomeapp/shared/lib/data';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const CONFIG_PATH = path.join(DATA_PATH, 'rag', 'config.json');

const DEFAULT_CONFIG: RagConfig = {
  collection: 'personal_documents',
  schedule: '0 2 * * *',
  sources: [
    {
      path: '/nas/volume2/root2/Cloud/Perso',
      label: 'Personal Documents',
      defaultCategories: ['document'],
      categoryMappings: [],
    },
  ],
};

export function readRagConfig(): RagConfig {
  ensureDirectoryExists(path.dirname(CONFIG_PATH));

  if (!fs.existsSync(CONFIG_PATH)) {
    // Write defaults on first access so the user can edit the file
    writeRagConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as RagConfig;
  } catch {
    console.warn('[ragConfig] Config file is corrupted, using defaults');
    return DEFAULT_CONFIG;
  }
}

export function writeRagConfig(config: RagConfig): void {
  ensureDirectoryExists(path.dirname(CONFIG_PATH));
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Given a file's absolute path and the source it belongs to,
 * return the matching categories.
 *
 * Strategy: find the categoryMapping whose subPath is the longest
 * prefix of the file's relative path. Falls back to source.defaultCategories.
 *
 * subPath uses forward slashes regardless of OS (normalized internally).
 */
export function resolveCategories(filePath: string, source: RagSource): string[] {
  // Normalize to forward slashes for consistent comparison
  const rel = path.relative(source.path, filePath).replace(/\\/g, '/');

  let bestMatch: { categories: string[]; depth: number } | null = null;

  for (const mapping of source.categoryMappings) {
    const normalized = mapping.subPath.replace(/\\/g, '/').replace(/\/$/, '');
    // Match if the relative path starts with the subPath as a directory prefix
    if (rel === normalized || rel.startsWith(normalized + '/')) {
      const depth = normalized.split('/').length;
      if (!bestMatch || depth > bestMatch.depth) {
        bestMatch = { categories: mapping.categories, depth };
      }
    }
  }

  return bestMatch ? bestMatch.categories : source.defaultCategories;
}
