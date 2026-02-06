import fs from 'fs';
import path from 'path';
import { AppConfig, SubApp } from '@/types';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config';
const LOGS_PATH = process.env.LOGS_PATH || '/app/logs';

// Enhanced logging function
function logToFile(level: 'INFO' | 'ERROR' | 'WARN', message: string, error?: any): void {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}${error ? ` - ${error.message || error}` : ''}\n`;

    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_PATH)) {
      fs.mkdirSync(LOGS_PATH, { recursive: true, mode: 0o755 });
    }

    const logFile = path.join(LOGS_PATH, 'app.log');
    fs.appendFileSync(logFile, logEntry);

    // Also log to console
    console.log(`${level}: ${message}`, error || '');
  } catch (logError) {
    console.error('Failed to write to log file:', logError);
    console.log(`${level}: ${message}`, error || '');
  }
}

// Ensure directories exist with better error handling
export function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
      logToFile('INFO', `Created directory: ${dirPath}`);
    }
  } catch (error) {
    logToFile('ERROR', `Failed to create directory: ${dirPath}`, error);
    throw error;
  }
}

// Initialize data directories with better error handling
export function initializeDataDirectories(): void {
  try {
    logToFile('INFO', 'Initializing data directories...');

    // Create main directories first
    ensureDirectoryExists(DATA_PATH);
    ensureDirectoryExists(CONFIG_PATH);
    ensureDirectoryExists(LOGS_PATH);

    // Create sub-app directories
    ensureDirectoryExists(path.join(DATA_PATH, 'bookmarks'));
    ensureDirectoryExists(path.join(DATA_PATH, 'anime'));
    ensureDirectoryExists(path.join(DATA_PATH, 'services'));
    ensureDirectoryExists(path.join(DATA_PATH, 'savings'));

    logToFile('INFO', 'Data directories initialized successfully');
  } catch (error) {
    logToFile('ERROR', 'Failed to initialize data directories', error);
    throw error;
  }
}

// Read JSON file with error handling
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      logToFile('INFO', `Successfully read JSON file: ${filePath}`);
      return JSON.parse(data);
    }
    logToFile('INFO', `JSON file not found, using default: ${filePath}`);
    return defaultValue;
  } catch (error) {
    logToFile('ERROR', `Error reading JSON file ${filePath}`, error);
    return defaultValue;
  }
}

// Write JSON file with error handling
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    logToFile('INFO', `Successfully wrote JSON file: ${filePath}`);
    return true;
  } catch (error) {
    logToFile('ERROR', `Error writing JSON file ${filePath}`, error);
    return false;
  }
}

// Get app configuration
export function getAppConfig(): AppConfig {
  try {
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

    const config = readJsonFile(configPath, defaultConfig);

    // Write default config if it doesn't exist
    if (!fs.existsSync(configPath)) {
      writeJsonFile(configPath, defaultConfig);
    }

    return config;
  } catch (error) {
    logToFile('ERROR', 'Failed to get app config', error);
    throw error;
  }
}

// Get available sub-applications
export function getSubApps(): SubApp[] {
  try {
    const subApps = [
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
        enabled: true // Enabled in Phase 3
      },
      {
        id: 'files',
        name: 'File Explorer',
        description: 'Browse your NAS files',
        icon: '📁',
        route: '/files',
        enabled: true // Will be enabled in Phase 3
      },
      {
        id: 'savings',
        name: 'Savings',
        description: 'Manage your financial investments',
        icon: '💰',
        route: '/savings',
        enabled: true
      }
    ];

    logToFile('INFO', `Retrieved ${subApps.length} sub-applications`);
    return subApps;
  } catch (error) {
    logToFile('ERROR', 'Failed to get sub-applications', error);
    throw error;
  }
}
