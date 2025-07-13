/**
 * Central export file for all models
 * This provides a clean import interface for the rest of the application
 */

// Re-export all subapp models
export * from './bookmarks';
export * from './files';  
export * from './services';
export * from './shared';

// Legacy compatibility - keeping the old structure for now
// TODO: Remove these when all imports are updated
export type {
  Bookmark,
  BookmarkCategory
} from './bookmarks';

export type {
  FileSystemItem,
  FileRoot
} from './files';

export type {
  SubApp,
  ServiceLink,
  AppConfig
} from './services';
