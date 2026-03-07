# Step 3: Split Anime Subapp

**Branch**: `migration/monorepo`  
**Depends on**: Step 2 completed and validated  
**Checkpoint**: Anime runs as a standalone Next.js app on its own port with its own docker-compose.

---

## Goal

Extract the anime subapp into `apps/anime/` — a fully independent Next.js application with its own `package.json`, Dockerfile, and docker-compose file. The anime page, all anime API routes, anime components/models/hooks/lib move into this app.

---

## Why anime first

- Single page (SPA) — no filesystem sub-routing
- No special npm dependencies beyond what's in shared
- Most self-contained: components, models, lib, hooks are all anime-specific
- Stable and finished — low risk of needing changes during migration

---

## Tasks

### 3.1 — Create the anime app skeleton

```
apps/anime/
├── package.json
├── next.config.js
├── tsconfig.json
└── src/
    ├── pages/
    │   ├── _app.tsx
    │   ├── _document.tsx
    │   └── anime.tsx
    ├── components/
    ├── models/
    ├── hooks/
    └── lib/
```

```json
// apps/anime/package.json
{
  "name": "@myhomeapp/anime",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@myhomeapp/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

```javascript
// apps/anime/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // basePath: '/anime',  // Uncomment if routed through portal
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
}
module.exports = nextConfig;
```

```jsonc
// apps/anime/tsconfig.json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@myhomeapp/shared/*": ["../../packages/shared/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 3.2 — Move anime files

| Source | Destination |
|--------|-------------|
| `src/pages/anime.tsx` | `apps/anime/src/pages/anime.tsx` |
| `src/pages/api/anime/**` | `apps/anime/src/pages/api/anime/**` |
| `src/pages/api/actions/perform-automated-tasks.ts` | Copy, then strip to anime-only tasks (see 2.5) |
| `src/components/anime/**` | `apps/anime/src/components/anime/**` |
| `src/models/anime/**` | `apps/anime/src/models/anime/**` |
| `src/hooks/useAnimeUrlState.ts` | `apps/anime/src/hooks/useAnimeUrlState.ts` |
| `src/lib/anime.ts` | `apps/anime/src/lib/anime.ts` |
| `src/lib/animeUtils.ts` | `apps/anime/src/lib/animeUtils.ts` |
| `src/lib/animeUrlParams.ts` | `apps/anime/src/lib/animeUrlParams.ts` |
| `src/lib/providers.ts` | `apps/anime/src/lib/providers.ts` |

### 3.3 — Create anime-specific `_app.tsx`

```tsx
// apps/anime/src/pages/_app.tsx
import { AppProps } from 'next/app';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

Note: No `Layout` wrapper for now — the anime app runs standalone. The portal will provide the global nav when accessed through rewrites. Each subapp can optionally include a minimal nav header for standalone use.

### 3.4 — Create anime `_document.tsx`

Copy from the existing `src/pages/_document.tsx` — likely just the default Next.js document.

### 3.5 — Create anime-specific automated tasks endpoint

```typescript
// apps/anime/src/pages/api/actions/perform-tasks.ts
// Only anime tasks — strip savings tasks from the original
```

This endpoint runs only `taskAnimeCronSync()`. The savings tasks do not belong here.

### 3.6 — Update imports

All files moved to `apps/anime/src/` need their imports updated:

| Old import | New import |
|-----------|------------|
| `from '@/components/shared'` | `from '@myhomeapp/shared/components'` |
| `from '@/lib/data'` | `from '@myhomeapp/shared/lib/data'` |
| `from '@/models/shared'` | `from '@myhomeapp/shared/models'` |
| `from '@/models'` (shared types only) | `from '@myhomeapp/shared/models'` |
| `from '@/components/anime'` | `from '@/components/anime'` (stays — same relative structure) |
| `from '@/lib/anime'` | `from '@/lib/anime'` (stays) |

### 3.7 — Create Dockerfile

```dockerfile
# apps/anime/Dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/anime/package.json ./apps/anime/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
ARG BUILD_DATE=default
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/anime/node_modules ./apps/anime/node_modules
COPY packages/shared ./packages/shared
COPY apps/anime ./apps/anime
COPY pnpm-workspace.yaml package.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @myhomeapp/anime build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/anime/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/anime/.next/static ./apps/anime/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/anime/public ./apps/anime/public
RUN mkdir -p /app/data /app/config /app/logs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/anime/server.js"]
```

> Note: The exact standalone output paths may need adjustment. Next.js with `outputFileTracingRoot` set to the monorepo root will produce the standalone output relative to that root.

### 3.8 — Create docker-compose.anime.yml

```yaml
version: '3.8'

services:
  anime:
    image: myhomeapp-anime:${BUILD_VERSION:-latest}
    build:
      context: .
      dockerfile: apps/anime/Dockerfile
      args:
        - BUILD_DATE=2026-03-04-v1
    ports:
      - "12351:3000"
    volumes:
      - /volume4/root4/AppData/MyHomeApp-v2/database/anime:/app/data
      - /volume4/root4/AppData/MyHomeApp-v2/config:/app/config
      - /volume4/root4/AppData/MyHomeApp-v2/logs/anime:/app/logs
    environment:
      - NODE_ENV=production
      - DATA_PATH=/app/data
      - CONFIG_PATH=/app/config
      - LOGS_PATH=/app/logs
      - CRON_SECRET=mysecretcronjobkey
    restart: unless-stopped
    container_name: myhomeapp-v2-anime
    user: "0:0"

  anime-cron:
    image: alpine:latest
    depends_on:
      - anime
    command: >
      sh -c "apk add --no-cache curl && printf '0 2 * * * curl -X POST -H \"Authorization: Bearer mysecretcronjobkey\" -H \"Content-Type: application/json\" -d \"{\\\"origin\\\":\\\"anime cron job\\\"}\" http://anime:3000/api/actions/perform-tasks\n' > /etc/crontabs/root && crond -f -d 8"
    restart: unless-stopped
    container_name: myhomeapp-v2-anime-cron
```

### 3.9 — Remove anime from monolith (optional at this stage)

At this point we can either:
- **A)** Leave the anime code in the monolith too (no breaking change, both work)
- **B)** Remove it from the monolith to keep things clean

**Recommendation**: Leave it in the monolith for now. Remove in step 7 (cleanup). This way the legacy `main` branch is never affected, and the monolith can still serve anime if the split fails.

---

## Files Inventory

### Anime-specific files being moved (complete list)

**Pages:**
- `anime.tsx` (main page)

**API Routes (10 files):**
- `api/anime/auth.ts`
- `api/anime/big-sync.ts`
- `api/anime/cron-sync.ts`
- `api/anime/discover-providers.ts`
- `api/anime/sync.ts`
- `api/anime/animes/index.ts`
- `api/anime/animes/[id].ts`
- `api/anime/animes/[id]/extensions.ts`
- `api/anime/animes/[id]/hide.ts`
- `api/anime/animes/[id]/mal-status.ts`
- `api/anime/animes/[id]/providers.ts`

**Components (19 files + CSS):**
- `AnimeCardView.tsx` + `.module.css` + `.d.ts`
- `AnimePageLayout.tsx` + `.module.css` + `.d.ts`
- `AnimeSidebar.tsx` + `.module.css` + `.d.ts`
- `AnimeTable.tsx` + `.module.css` + `.d.ts`
- `SeasonSelector.tsx` + `.module.css` + `.d.ts`
- `index.ts`
- `sidebar/AccountSection.tsx` + `.module.css` + `.d.ts`
- `sidebar/DataSyncSection.tsx` + `.module.css` + `.d.ts`
- `sidebar/DisplaySection.tsx` + `.module.css` + `.d.ts`
- `sidebar/FiltersSection.tsx` + `.module.css` + `.d.ts`
- `sidebar/SortOrderSection.tsx` + `.module.css` + `.d.ts`
- `sidebar/StatsSection.tsx` + `.module.css` + `.d.ts`
- `sidebar/ViewsSection.tsx` + `.module.css` + `.d.ts`
- `sidebar/index.ts`

**Models:**
- `models/anime/index.ts`

**Hooks:**
- `hooks/useAnimeUrlState.ts`

**Lib (4 files):**
- `lib/anime.ts`
- `lib/animeUtils.ts`
- `lib/animeUrlParams.ts`
- `lib/providers.ts`

---

## Checkpoint Validation

- [x] `pnpm --filter @myhomeapp/anime build` succeeds
- [x] `pnpm --filter @myhomeapp/anime dev` starts on port 3001
- [x] `http://localhost:3001/anime` loads the anime page
- [x] Anime API routes respond (test with requests.http, targeting port 3001)
- [x] Anime data reads correctly from disk
- [x] Docker build: `docker compose -f docker-compose.anime.yml build`
- [x] Docker run: anime container starts, page loads on `:12351`
- [x] Cron test: `curl -X POST -H "Authorization: Bearer mysecretcronjobkey" http://localhost:12351/api/actions/perform-tasks`
- [x] Commit: `migration(step-3): extract anime subapp`
- [x] Push to `migration/monorepo`
- [x] Deploy `myhomeapp-v2-anime` stack in Portainer
- [x] Tag: `git tag migration-step-3-validated`
