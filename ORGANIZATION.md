# Project Organization

This document outlines the organizational structure of the MyHomeApp project, organized around subapps for better maintainability and scalability.

## Directory Structure

```
src/
├── components/
│   ├── shared/             # Shared components used across subapps
│   │   └── index.ts        # Exports for shared components
│   ├── anime/              # Anime app specific components
│   └── savings/            # Savings app specific components
├── models/
│   ├── shared/             # Common types and interfaces
│   │   └── index.ts        # API responses, pagination, etc.
│   ├── anime/              # Anime domain models
│   └── savings/            # Savings domain models
│   └── index.ts            # Central export (re-exports all subdomains)
├── pages/
│   ├── api/
│   │   ├── anime/          # Anime API endpoints
│   │   └── savings/        # Savings API endpoints
│   ├── anime.tsx          # Anime app page
│   └── savings.tsx        # Savings app page
└── types/                  # Legacy compatibility (deprecated)
    └── index.ts            # Re-exports from models/
```

## Organizational Principles

### 1. **Subapp-Centric Organization**
Each major feature (anime, savings) has its own:
- Component directory with app-specific UI components
- Model directory with domain-specific types and interfaces
- API directory with related endpoints grouped under a common route prefix

### 2. **Shared Resources**
Common components and types that are used across multiple subapps are placed in `shared/` directories.

### 3. **Clear Import Paths**
```typescript
// Subapp-specific imports
import { AnimeTable } from '@/components/anime';
import { AnimeEntry } from '@/models/anime';

// Shared component imports  
import { CollapsibleSection, Modal } from '@/components/shared';
import { ApiResponse } from '@/models/shared';

// Central imports (when you need multiple domains)
import { AnimeEntry, SubApp } from '@/models';
```

### 4. **API Route Organization**
API routes follow REST conventions within subapp contexts:
```
/api/anime/*         # All anime-related endpoints
/api/savings/*       # All savings-related endpoints
```

## Achieved Goals
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
