import fs from 'fs';
import path from 'path';
import { AppConfig, SubApp } from '@/types';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config';

// Ensure directories exist
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Initialize data directories
export function initializeDataDirectories(): void {
  ensureDirectoryExists(DATA_PATH);
  ensureDirectoryExists(CONFIG_PATH);
  ensureDirectoryExists(path.join(DATA_PATH, 'bookmarks'));
  ensureDirectoryExists(path.join(DATA_PATH, 'anime'));
  ensureDirectoryExists(path.join(DATA_PATH, 'services'));
}

// Read JSON file with error handling
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return defaultValue;
  }
}

// Write JSON file with error handling
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    return false;
  }
}

// Get app configuration
export function getAppConfig(): AppConfig {
  const configPath = path.join(CONFIG_PATH, 'app.json');
  const defaultConfig: AppConfig = {
    services: [
      {
        id: 'dsm',
        name: 'DSM',
        url: 'http://syno:5000',
        icon: '🖥️',
        description: 'Synology Disk Station Manager'
      },
      {
        id: 'portainer',
        name: 'Portainer',
        url: 'http://syno:9000/',
        icon: '🐳',
        description: 'Docker Container Management'
      },
      {
        id: 'sonarr',
        name: 'Sonarr',
        url: 'http://syno:8989/',
        icon: '📺',
        description: 'TV Series Management'
      },
      {
        id: 'qbittorrent',
        name: 'QbitTorrent',
        url: 'http://syno:8088/',
        icon: '⬇️',
        description: 'Torrent Client'
      },
      {
        id: 'jackett',
        name: 'Jackett',
        url: 'http://syno:9117/',
        icon: '🔍',
        description: 'Indexer Proxy'
      }
    ],
    dataPath: DATA_PATH,
    version: '1.0.0'
  };

  return readJsonFile(configPath, defaultConfig);
}

// Get available sub-applications
export function getSubApps(): SubApp[] {
  return [
    {
      id: 'services',
      name: 'Services',
      description: 'Quick access to all your services',
      icon: '🔗',
      route: '/services',
      enabled: true
    },
    {
      id: 'bookmarks',
      name: 'Bookmarks',
      description: 'Manage your bookmarks',
      icon: '🔖',
      route: '/bookmarks',
      enabled: true
    },
    {
      id: 'anime',
      name: 'Anime List',
      description: 'Track your anime progress',
      icon: '📺',
      route: '/anime',
      enabled: false // Will be enabled in Phase 3
    },
    {
      id: 'files',
      name: 'File Explorer',
      description: 'Browse your NAS files',
      icon: '📁',
      route: '/files',
      enabled: false // Will be enabled in Phase 3
    }
  ];
}
