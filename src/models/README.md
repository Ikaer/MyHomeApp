# Models Directory

This directory contains all TypeScript interfaces and type definitions for the MyHomeApp project.

## Structure

### Core Model Files

- **`bookmark.ts`** - Bookmark and category related types
- **`filesystem.ts`** - File system, file roots, and directory types  
- **`app.ts`** - Application configuration and service types
- **`common.ts`** - Shared/common types used across the application

### Export Strategy

- **`index.ts`** - Central export file that re-exports all models for easy importing

## Usage

### Recommended Import Pattern
```typescript
// Import specific types
import type { FileRoot, FileSystemItem } from '@/models';
import type { Bookmark, BookmarkCategory } from '@/models/bookmark';

// Or import from the central index
import type { FileRoot, Bookmark } from '@/models';
```

### Legacy Compatibility
The old `@/types` directory is maintained for backward compatibility but is deprecated. New code should import from `@/models`.

## Migration Notes

- ✅ API routes updated to import from `@/models`
- ✅ Components updated to use new model imports
- ✅ Legacy `@/types/index.ts` now re-exports from models for compatibility
- 🔄 Existing imports using `@/types` will continue to work but should be migrated

## File Organization Principles

1. **Single Responsibility** - Each file contains related types only
2. **Clear Naming** - File names clearly indicate their content domain
3. **Logical Grouping** - Related interfaces are grouped together
4. **Extensibility** - Easy to add new types without cluttering existing files
5. **Import Clarity** - Clear import paths that indicate data domain

## Future Improvements

- [ ] Add JSDoc documentation to all interfaces
- [ ] Consider adding validation schemas (Zod/Joi) alongside interfaces
- [ ] Add utility types and type guards where appropriate
- [ ] Create domain-specific subdirectories if models grow significantly
