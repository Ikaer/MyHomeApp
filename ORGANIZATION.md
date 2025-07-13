# Project Organization

This document outlines the organizational structure of the MyHomeApp project, organized around subapps for better maintainability and scalability.

## Directory Structure

```
src/
├── components/
│   ├── shared/             # Shared components used across subapps
│   │   ├── TreeView.tsx    # Hierarchical tree component
│   │   └── index.ts        # Exports for shared components
│   ├── bookmarks/          # Bookmark app specific components
│   │   └── index.ts
│   ├── files/              # File explorer app specific components
│   │   ├── FileExplorer.tsx
│   │   └── index.ts
│   └── services/           # Services app specific components
│       └── index.ts
├── models/
│   ├── shared/             # Common types and interfaces
│   │   └── index.ts        # API responses, pagination, etc.
│   ├── bookmarks/          # Bookmark domain models
│   │   └── index.ts        # Bookmark, BookmarkCategory, etc.
│   ├── files/              # File system domain models
│   │   └── index.ts        # FileRoot, FileSystemItem, etc.
│   ├── services/           # Services domain models
│   │   └── index.ts        # ServiceLink, AppConfig, etc.
│   └── index.ts            # Central export (re-exports all subdomains)
├── pages/
│   ├── api/
│   │   ├── bookmarks/      # Bookmark API endpoints
│   │   │   ├── index.ts    # GET/POST /api/bookmarks
│   │   │   ├── [id].ts     # GET/PUT/DELETE /api/bookmarks/:id
│   │   │   ├── categories/ # Bookmark categories
│   │   │   └── export/     # Bookmark export functionality
│   │   ├── files/          # File system API endpoints
│   │   │   ├── browse.ts   # POST /api/files/browse
│   │   │   └── roots/      # File root management
│   │   │       ├── index.ts    # GET/POST /api/files/roots
│   │   │       └── [id].ts     # GET/PUT/DELETE /api/files/roots/:id
│   │   └── services/       # Future services API endpoints
│   ├── bookmarks.tsx       # Bookmarks app page
│   ├── files.tsx          # File explorer app page
│   └── services.tsx       # Services app page
└── types/                  # Legacy compatibility (deprecated)
    └── index.ts            # Re-exports from models/
```

## Organizational Principles

### 1. **Subapp-Centric Organization**
Each major feature (bookmarks, files, services) has its own:
- Component directory with app-specific UI components
- Model directory with domain-specific types and interfaces
- API directory with related endpoints grouped under a common route prefix

### 2. **Shared Resources**
Common components and types that are used across multiple subapps are placed in `shared/` directories.

### 3. **Clear Import Paths**
```typescript
// Subapp-specific imports
import { FileExplorer } from '@/components/files';
import { FileRoot } from '@/models/files';

// Shared component imports  
import { TreeView } from '@/components/shared';
import { ApiResponse } from '@/models/shared';

// Central imports (when you need multiple domains)
import { FileRoot, Bookmark } from '@/models';
```

### 4. **API Route Organization**
API routes follow REST conventions within subapp contexts:
```
/api/bookmarks/*     # All bookmark-related endpoints
/api/files/*         # All file-related endpoints  
/api/services/*      # All service-related endpoints
```

## Migration Benefits

### ✅ **Before vs After**

| Before | After |
|--------|-------|
| `/api/file-roots` | `/api/files/roots` |
| `/api/filesystem/browse` | `/api/files/browse` |
| `@/components/FileExplorer` | `@/components/files/FileExplorer` |
| `@/components/TreeView` | `@/components/shared/TreeView` |
| `@/models/filesystem` | `@/models/files` |

### 🎯 **Achieved Goals**
- **Scalability**: Easy to add new subapps without cluttering existing structure
- **Maintainability**: Changes to one subapp don't affect others
- **Discoverability**: Clear naming conventions make it obvious where to find/add code
- **Consistency**: All subapps follow the same organizational pattern
- **Team Collaboration**: Multiple developers can work on different subapps with minimal conflicts

## Future Subapp Addition

To add a new subapp (e.g., "monitoring"):

1. **Create directories:**
   ```
   src/components/monitoring/
   src/models/monitoring/  
   src/pages/api/monitoring/
   ```

2. **Add the page:**
   ```
   src/pages/monitoring.tsx
   ```

3. **Update central exports:**
   ```typescript
   // src/models/index.ts
   export * from './monitoring';
   ```

This structure ensures the codebase remains organized and maintainable as it grows!
