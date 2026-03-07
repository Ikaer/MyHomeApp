/**
 * Ingestion manifest management.
 * Tracks which files have been ingested, their content hashes, and their Qdrant chunk IDs.
 * Stored at DATA_PATH/rag/ingestion_manifest.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IngestManifest, ManifestEntry } from '@/models/rag';
import { ensureDirectoryExists } from '@myhomeapp/shared/lib/data';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const MANIFEST_DIR = path.join(DATA_PATH, 'rag');
const MANIFEST_PATH = path.join(MANIFEST_DIR, 'ingestion_manifest.json');

const MANIFEST_VERSION = 1;

export function readManifest(): IngestManifest {
  ensureDirectoryExists(MANIFEST_DIR);

  if (!fs.existsSync(MANIFEST_PATH)) {
    return { version: MANIFEST_VERSION, lastRun: null, files: {} };
  }

  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as IngestManifest;
  } catch {
    // Corrupt manifest — start fresh
    return { version: MANIFEST_VERSION, lastRun: null, files: {} };
  }
}

export function writeManifest(manifest: IngestManifest): void {
  ensureDirectoryExists(MANIFEST_DIR);
  manifest.lastRun = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

export function computeFileHash(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function getManifestEntry(manifest: IngestManifest, filePath: string, collection?: string): ManifestEntry | undefined {
  if (collection) {
    // Only look up by scoped key — no legacy fallback.
    // Old unscoped keys will cause a miss → file gets re-ingested → new scoped key written.
    // This is intentional: ensures each collection maintains its own independent ingest state.
    return manifest.files[scopedKey(collection, filePath)];
  }
  return manifest.files[normalizePath(filePath)];
}

export function setManifestEntry(manifest: IngestManifest, filePath: string, entry: ManifestEntry, collection?: string): void {
  const key = collection ? scopedKey(collection, filePath) : normalizePath(filePath);
  manifest.files[key] = entry;
  // Remove any legacy unscoped key for the same file to avoid stale duplicates
  if (collection) {
    const legacy = normalizePath(filePath);
    if (legacy !== key && manifest.files[legacy]) {
      delete manifest.files[legacy];
    }
  }
}

export function removeManifestEntry(manifest: IngestManifest, filePath: string, collection?: string): void {
  if (collection) {
    delete manifest.files[scopedKey(collection, filePath)];
  }
  // Also remove legacy unscoped key if present
  delete manifest.files[normalizePath(filePath)];
}

/** Normalize path separators for cross-platform key consistency */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Scoped key format: "{collection}::{normalizedPath}" — prevents cross-source skip collisions */
function scopedKey(collection: string, filePath: string): string {
  return `${collection}::${normalizePath(filePath)}`;
}
