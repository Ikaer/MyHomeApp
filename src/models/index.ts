/**
 * Central export file for all models
 * This provides a clean import interface for the rest of the application
 */

// Re-export all subapp models
export * from './anime';
export * from './services';
export * from './shared';
export * from './savings';
export * from './anime';

// Legacy compatibility - keeping the old structure for now
// TODO: Remove these when all imports are updated
export type {
  SubApp,
  ServiceLink,
  AppConfig
} from './services';
