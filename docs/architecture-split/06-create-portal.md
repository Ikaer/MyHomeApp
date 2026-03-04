# Step 6: Create Portal App

**Branch**: `migration/monorepo`  
**Depends on**: Steps 3-5 completed and validated (all subapps running independently)  
**Checkpoint**: Portal provides a unified entry point with nav header, proxying to all subapps via Next.js rewrites.

---

## Goal

Create `apps/portal/` — a minimal Next.js app that serves the dashboard homepage and acts as a reverse proxy to all subapps using Next.js rewrites. This is the entry point users navigate to, providing the unified header/nav across all subapps.

---

## What the Portal Does

1. **Dashboard page** (`/`) — Shows the SubAppCard grid (same as current `index.tsx`)
2. **Layout with nav** — Header with links to each subapp
3. **Reverse proxy** — Rewrites `/anime/*`, `/savings/*`, `/rag/*` to the corresponding subapp containers
4. **Subapps API** — Serves `/api/subapps` (list of available subapps)
5. **Tasks history API** — Serves `/api/actions/get-tasks-history` (aggregated from all subapps, or kept local)

---

## Tasks

### 6.1 — Create the portal app skeleton

```
apps/portal/
├── package.json
├── next.config.js
├── tsconfig.json
└── src/
    ├── pages/
    │   ├── _app.tsx
    │   ├── _document.tsx
    │   ├── index.tsx
    │   └── api/
    │       └── subapps.ts
    ├── components/
    │   ├── Layout.tsx
    │   └── SubAppCard.tsx
    │       SubAppCard.module.css
    │       SubAppCard.module.css.d.ts
    └── lib/
```

```json
// apps/portal/package.json
{
  "name": "@myhomeapp/portal",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
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

### 6.2 — Configure rewrites

```javascript
// apps/portal/next.config.js
const ANIME_URL = process.env.ANIME_URL || 'http://localhost:3001';
const SAVINGS_URL = process.env.SAVINGS_URL || 'http://localhost:3002';
const RAG_URL = process.env.RAG_URL || 'http://localhost:3003';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
  async rewrites() {
    return [
      // Anime
      { source: '/anime', destination: `${ANIME_URL}/anime` },
      { source: '/anime/:path*', destination: `${ANIME_URL}/anime/:path*` },
      { source: '/api/anime/:path*', destination: `${ANIME_URL}/api/anime/:path*` },
      
      // Savings
      { source: '/savings', destination: `${SAVINGS_URL}/savings` },
      { source: '/savings/:path*', destination: `${SAVINGS_URL}/savings/:path*` },
      { source: '/api/savings/:path*', destination: `${SAVINGS_URL}/api/savings/:path*` },
      
      // RAG
      { source: '/rag', destination: `${RAG_URL}/rag` },
      { source: '/rag/:path*', destination: `${RAG_URL}/rag/:path*` },
      { source: '/api/rag/:path*', destination: `${RAG_URL}/api/rag/:path*` },
    ];
  },
};

module.exports = nextConfig;
```

### 6.3 — Move portal-specific files

| Source | Destination |
|--------|-------------|
| `src/pages/index.tsx` | `apps/portal/src/pages/index.tsx` |
| `src/pages/api/subapps.ts` | `apps/portal/src/pages/api/subapps.ts` |
| `src/pages/api/actions/get-tasks-history.ts` | `apps/portal/src/pages/api/actions/get-tasks-history.ts` |
| `src/components/Layout.tsx` | `apps/portal/src/components/Layout.tsx` |
| `src/components/SubAppCard.tsx` | `apps/portal/src/components/SubAppCard.tsx` |
| `src/components/SubAppCard.module.css` | `apps/portal/src/components/SubAppCard.module.css` |
| `src/components/SubAppCard.module.css.d.ts` | `apps/portal/src/components/SubAppCard.module.css.d.ts` |

### 6.4 — Create portal `_app.tsx`

```tsx
// apps/portal/src/pages/_app.tsx
import { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
```

The portal is the **only app that uses the Layout wrapper** — subapps don't wrap in Layout since the header/nav comes from the portal when accessed through rewrites.

### 6.5 — Handle the Layout + rewrites interaction

This is the trickiest part. When the portal proxies to a subapp, the subapp's HTML is returned to the browser. But the browser URL stays as `/anime` (portal URL). The subapp's `_app.tsx` does NOT include the portal's `Layout`.

**Two approaches:**

#### Approach A: Subapps include their own minimal header (recommended for simplicity)

Each subapp's `_app.tsx` wraps in a lightweight version of the Layout that shows the nav. This means the header exists in all modes (standalone + proxied). Simple, works everywhere.

#### Approach B: Portal injects Layout via iframe/client-side composition

More complex, not worth it for a personal project.

**Recommendation**: Go with Approach A. Each subapp includes a minimal nav header. The portal's Layout and the subapps' Layout can share the same component from `@myhomeapp/shared`.

This means: move `Layout.tsx` to `packages/shared/components/Layout.tsx` and have all apps use it:

```tsx
// packages/shared/components/Layout.tsx
// The existing Layout component — each app imports it
```

Update the shared package exports:
```typescript
// packages/shared/components/index.ts
export { default as Layout } from './Layout';
```

Then each app's `_app.tsx` uses it:
```tsx
import { Layout } from '@myhomeapp/shared/components';
```

### 6.6 — Update subapps to include Layout

Go back and update anime, savings, and rag `_app.tsx` to use the shared Layout:

```tsx
// apps/anime/src/pages/_app.tsx (updated)
import { AppProps } from 'next/app';
import { Layout } from '@myhomeapp/shared/components';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
```

The Layout's nav links need to be **configurable** — when running standalone on `localhost:3001`, the "Savings" link should go to `http://localhost:3002/savings`. When running behind the portal, it should go to `/savings`.

Solution: Use environment variables for nav link URLs, defaulting to relative paths (which work behind the portal):

```tsx
// Layout receives subapps config with proper URLs
const subApps = [
  { name: 'Anime', route: process.env.NEXT_PUBLIC_ANIME_URL || '/anime' },
  { name: 'Savings', route: process.env.NEXT_PUBLIC_SAVINGS_URL || '/savings' },
  { name: 'RAG', route: process.env.NEXT_PUBLIC_RAG_URL || '/rag' },
];
```

### 6.7 — Create Dockerfile

```dockerfile
# apps/portal/Dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/portal/package.json ./apps/portal/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ARG BUILD_DATE=default
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/portal/node_modules ./apps/portal/node_modules
COPY packages/shared ./packages/shared
COPY apps/portal ./apps/portal
COPY pnpm-workspace.yaml package.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @myhomeapp/portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/public ./apps/portal/public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/portal/server.js"]
```

### 6.8 — Create docker-compose.yml (portal)

```yaml
version: '3.8'

services:
  portal:
    image: myhomeapp-portal:${BUILD_VERSION:-latest}
    build:
      context: .
      dockerfile: apps/portal/Dockerfile
      args:
        - BUILD_DATE=2026-03-04-v1
    ports:
      - "12350:3000"
    environment:
      - NODE_ENV=production
      - ANIME_URL=http://myhomeapp-v2-anime:3000
      - SAVINGS_URL=http://myhomeapp-v2-savings:3000
      - RAG_URL=http://myhomeapp-v2-rag:3000
    restart: unless-stopped
    container_name: myhomeapp-v2-portal
```

> **Important**: For the portal to reach subapp containers, they must be on the same Docker network. Either use an explicit external network shared across all compose files, or use container names with the default bridge network.

### 6.9 — Docker networking

Create a shared Docker network for inter-stack communication:

```yaml
# Add to each docker-compose file:
networks:
  myhomeapp-v2:
    external: true

# Each service joins it:
services:
  portal:
    networks:
      - myhomeapp-v2
```

Create the network once:
```bash
docker network create myhomeapp-v2
```

---

## Files Inventory

### Portal-specific files

**Pages:**
- `pages/index.tsx` (dashboard)
- `pages/_app.tsx`
- `pages/_document.tsx`
- `pages/api/subapps.ts`
- `pages/api/actions/get-tasks-history.ts` (optional — may aggregate from subapps)

**Components:**
- `components/Layout.tsx` → moved to shared
- `components/SubAppCard.tsx` + `.module.css` + `.d.ts`

---

## Checkpoint Validation

- [ ] `pnpm --filter @myhomeapp/portal build` succeeds
- [ ] `pnpm --filter @myhomeapp/portal dev` starts on port 3000
- [ ] `http://localhost:3000` shows the dashboard with SubAppCards
- [ ] Clicking "Anime" navigates to `/anime` and the anime page loads (via rewrite)
- [ ] Clicking "Savings" navigates to `/savings` and the savings page loads (via rewrite)
- [ ] Clicking "RAG" navigates to `/rag` and the RAG page loads (via rewrite)
- [ ] Nav header shows on all subapp pages
- [ ] API calls from subapp pages work through the portal (e.g., `/api/anime/animes` proxied correctly)
- [ ] Docker build: `docker compose -f docker-compose.yml build` (portal)
- [ ] Docker run: portal starts on `:12350`, all rewrites work
- [ ] Docker networking: portal can reach subapp containers
- [ ] Commit: `migration(step-6): create portal with rewrites`
- [ ] Push to `migration/monorepo`
- [ ] Deploy `myhomeapp-v2-portal` stack in Portainer
- [ ] Tag: `git tag migration-step-6-validated`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Rewrites don't proxy correctly | Test locally first with all 4 dev servers running; check Next.js rewrite docs for edge cases |
| Docker networking between stacks | Use explicit shared Docker network (`myhomeapp-v2`); all compose files reference it |
| CSS/assets not loading through proxy | Next.js rewrites handle `/_next/static/*` — may need additional rewrite rules for subapp static assets |
| Layout/nav shows twice (portal + subapp) | Since subapps return full HTML via rewrite, only subapp's Layout shows — portal Layout only wraps portal's own pages |
| CORS issues | Same origin since portal proxies — shouldn't be an issue; if it is, add CORS headers in subapp API routes |

---

## Open Decision: Static Assets Through Rewrites

When the portal proxies `/anime` to the anime container, the anime HTML may reference `/_next/static/...` assets from the anime build. These requests go to the portal (same origin), but the portal doesn't have anime's static files.

**Solutions:**

1. **Add `/_next` rewrites per subapp** — requires prefix-based static asset paths (complex)
2. **Use `assetPrefix` in subapp next.config.js** — each subapp serves its own assets from its own URL
3. **Use `basePath` in subapp next.config.js** — Next.js automatically prefixes all asset URLs

**Recommendation**: Use `basePath` in each subapp's next.config.js:

```javascript
// apps/anime/next.config.js
module.exports = {
  basePath: '/anime',
  // ...
};
```

This makes the anime app serve at `/anime` natively and prefixes all static asset URLs with `/anime/_next/...`, which the portal rewrite handles correctly. This is the cleanest approach and is the standard Next.js multi-zone pattern.
