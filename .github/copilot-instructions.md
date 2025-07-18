# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot to understand the MyHomeApp project structure, patterns, and conventions.

## Project Overview

MyHomeApp is a unified dashboard application for Synology NAS management, built with Next.js 14, TypeScript, and deployed via Docker. The app provides quick access to services and data management tools through a subapp-based architecture.

## Architecture & Patterns

### Subapp Organization
The project is organized around domain-specific subapps:
- **Services**: Quick access dashboard to NAS services
- **Bookmarks**: Full CRUD bookmark management with categories and tags
- **Files**: File explorer with TreeView and directory browsing
- **Anime**: (Planned) MyAnimeList integration for anime tracking

### Directory Structure
```
src/
├── components/
│   ├── shared/           # Cross-subapp components (TreeView, etc.)
│   ├── bookmarks/        # Bookmark-specific components
│   ├── files/            # File explorer components
│   └── services/         # Service dashboard components
├── models/
│   ├── shared/           # Common types and interfaces
│   ├── bookmarks/        # Bookmark domain models
│   ├── files/            # File system models
│   └── index.ts          # Central exports
├── pages/
│   ├── api/
│   │   ├── bookmarks/    # Bookmark API endpoints
│   │   ├── files/        # File system API endpoints
│   │   └── services/     # Service API endpoints
│   ├── bookmarks.tsx     # Bookmark management page
│   ├── files.tsx         # File explorer page
│   └── services.tsx      # Services dashboard
└── lib/                  # Utility functions and data operations
```

## Code Conventions

### Import Patterns
```typescript
// Prefer domain-specific imports
import { FileExplorer } from '@/components/files';
import { BookmarkCard } from '@/components/bookmarks';
import { FileRoot } from '@/models/files';
import { Bookmark } from '@/models/bookmarks';

// Shared components
import { TreeView } from '@/components/shared';

// Central model imports when needed
import type { FileRoot, Bookmark } from '@/models';
```

### API Route Structure
Follow RESTful conventions within subapp contexts:
```
/api/bookmarks/*         # All bookmark operations
/api/files/*            # All file operations
/api/services/*         # All service operations
```

### Component Organization
- Each subapp has its own component directory
- Components include corresponding CSS modules when needed
- Index files provide clean exports: `export { FileExplorer } from './FileExplorer';`
- Shared components go in `components/shared/`

### Data Storage
- JSON file-based storage in `/app/data/`
- Each subapp maintains its own data directory
- Comprehensive error handling and logging
- Automatic directory creation

## Technology Stack

- **Frontend**: Next.js 14.0.0, React, TypeScript
- **Styling**: CSS Modules with custom CSS
- **API**: Next.js API routes
- **Data**: JSON files with Node.js fs operations
- **Deployment**: Docker with Portainer integration
- **Target**: TV browser (4K) - dark theme only

## Styling Guidelines

### Theme
- Dark theme only (optimized for TV viewing)
- CSS custom properties for colors:
  ```css
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --accent-primary: #007bff;
  ```

### CSS Modules
- Use CSS Modules for component-specific styling
- File naming: `ComponentName.module.css`
- Class naming: camelCase (`fileExplorer`, `rootCard`)

### Responsive Design
- Optimized for TV/4K displays, but the OS is a windows with a 300% zoom factor.
- No mobile responsiveness required
- Grid layouts and flexbox for organization

## Development Patterns

### Error Handling
```typescript
// API routes
try {
  const data = await operation();
  res.status(200).json(data);
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ error: 'Internal server error' });
}

// Client-side
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('Request failed');
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  alert('Operation failed');
}
```

### React Patterns
```typescript
// State management
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Form handling
const [formData, setFormData] = useState({
  field1: '',
  field2: ''
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Handle form submission
};
```

## File Conventions

### TypeScript
- Strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper typing for API responses and form data
- Export types from domain-specific model files

### API Endpoints
```typescript
// Standard API handler pattern
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        // Handle GET
        break;
      case 'POST':
        // Handle POST
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end('Method Not Allowed');
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Component Structure
```typescript
interface ComponentProps {
  // Define props
}

export default function Component({ prop1, prop2 }: ComponentProps) {
  // State and effects
  
  // Event handlers
  
  // Render
  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  );
}
```

## Data Models

### Key Interfaces
```typescript
// Bookmark domain
interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// File system domain
interface FileRoot {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Environment & Deployment

### Docker Configuration
- Multi-stage build with Node.js 18-alpine
- Port mapping: 12344:3000
- Volume mounts for data persistence
- Environment variables for configuration

### File Paths
- Data: `/app/data/`
- Config: `/app/config/`
- Logs: `/app/logs/`
- NAS volumes: `/nas/volume1-5` (read-only)

## Future Development

### Adding New Subapps
1. Create component directory: `src/components/[subapp]/`
2. Create model directory: `src/models/[subapp]/`
3. Create API routes: `src/pages/api/[subapp]/`
4. Create main page: `src/pages/[subapp].tsx`
5. Update central exports in `src/models/index.ts`

### Anime Subapp (Planned)
- MyAnimeList API integration
- Seasonal anime data synchronization
- User-specific extension data (providers, notes)
- Table-based display with sorting and filtering

## Best Practices

1. **Consistency**: Follow established patterns for new features
2. **Domain Separation**: Keep subapp code isolated and organized
3. **Error Handling**: Comprehensive error handling on both client and server
4. **Type Safety**: Proper TypeScript usage throughout
5. **Performance**: Lazy loading and efficient data fetching
6. **Maintainability**: Clear naming conventions and documentation

## Common Tasks

### Adding a New Component
```typescript
// 1. Create component file
// src/components/[domain]/NewComponent.tsx

// 2. Add CSS module if needed
// src/components/[domain]/NewComponent.module.css

// 3. Export from index
// src/components/[domain]/index.ts
export { NewComponent } from './NewComponent';
```

### Adding a New API Endpoint
```typescript
// 1. Create endpoint file
// src/pages/api/[domain]/[resource].ts

// 2. Implement handler with proper error handling
// 3. Add TypeScript interfaces for request/response
// 4. Test with proper HTTP methods
```

### Adding a New Model
```typescript
// 1. Create interface in domain model file
// src/models/[domain]/index.ts

// 2. Export from central index
// src/models/index.ts
export * from './[domain]';
```

Remember: This project prioritizes maintainability, type safety, and consistent patterns across all subapps. When in doubt, follow the established patterns in the bookmarks and files subapps.