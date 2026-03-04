# MyHomeApp — Architecture Split: Implementation Plan

**Decision:** Option 2 — Monorepo with pnpm Workspaces  
**Status:** Planning  
**Date:** 2026-03-02

---

## Current State & Problems

### What we have today

A **single Next.js 14 monolith** deployed as one Docker image, containing three subapps (anime, savings, rag) plus shared infrastructure:

```
┌─────────────────────────────────────────────────┐
│  myhomeapp (single Next.js container)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Anime   │ │ Savings  │ │   RAG    │        │
│  │  pages   │ │  pages   │ │  pages   │        │
│  │  api     │ │  api     │ │  api     │        │
│  │  models  │ │  models  │ │  models  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ┌─────────────────────────────────────┐        │
│  │  Shared: Layout, globals.css,       │        │
│  │  components, data.ts, cron system   │        │
│  └─────────────────────────────────────┘        │
├─────────────────────────────────────────────────┤
│  External: qdrant, docling-sidecar, cron        │
└─────────────────────────────────────────────────┘
```

### The four problems

| # | Problem | Impact |
|---|---------|--------|
| **P1** | **Deployment fragility** — Adding RAG/docling broke the build, taking down working anime & savings | Can't iterate on new features safely |
| **P2** | **Shared concerns** — Common styles (globals.css, CSS vars, theme) and the jobs system (cron endpoint running all tasks) need to stay unified | Any split must preserve code reuse |
| **P3** | **Docker composition** — Everything in one docker-compose.yml, one failure = all down | Portainer supports multiple compose files |
| **P4** | **AI context bloat** — Copilot must scan 31 API routes, 3 subapps of components/models/hooks to work on one feature | Slower, more error-prone AI assistance |

---

## Inventory of Cross-Cutting Concerns

Before evaluating options, here's what's actually shared today:

### Shared Code

| Asset | Used By | Notes |
|-------|---------|-------|
| `globals.css` (158 lines) | All subapps | CSS vars, theme, layout classes, header/nav |
| `Layout.tsx` | All pages | Header, nav, container — fetches subapp list from API |
| `_app.tsx` | All pages | Wraps everything in Layout |
| `components/shared/` | All subapps | Modal, Button, Card, CardGrid, Tabs, CollapsibleSection, SortableHeaderButton, table components |
| `lib/data.ts` | All subapps | `readJsonFile`, `writeJsonFile`, `ensureDirectoryExists`, `getSubApps()` |
| `models/shared/` | All subapps | `ApiResponse`, `SubApp`, `AutomatedTask*` types |
| `types/index.ts` | Legacy | Re-exports from `@/models` |

### Shared Infrastructure

| Asset | Used By | Notes |
|-------|---------|-------|
| Cron container | Anime + Savings | Hits one endpoint that runs 4 tasks (1 anime, 3 savings) |
| `perform-automated-tasks.ts` | Anime + Savings | Single API endpoint orchestrating all background jobs |
| `get-tasks-history.ts` | Dashboard | Exposes execution history |

### Subapp-Specific Dependencies

| Subapp | External Dependencies | External Services |
|--------|----------------------|-------------------|
| **Anime** | (none special) | MyAnimeList API |
| **Savings** | `yahoo-finance2`, `recharts`, `xirr` | — |
| **RAG** | `pdf-parse`, `pdf2pic` | Qdrant, Docling sidecar, Ollama |

### Subapp Isolation Assessment

| Subapp | Pages | API Routes | Has Sub-routing? | Stability |
|--------|-------|------------|-------------------|-----------|
| **Anime** | `anime.tsx` (SPA) | 10 routes | No | ✅ Stable |
| **Savings** | `savings.tsx` + `savings/[accountId].tsx` + `savings/default.tsx` | 13 routes | Yes (filesystem) | ✅ Stable |
| **RAG** | `rag.tsx` (SPA) | 4 routes | No | 🚧 WIP |

---

## The Plan: Monorepo with pnpm Workspaces

### Concept

Restructure into a **pnpm workspaces monorepo** with independent apps that share a common package. Each subapp is a standalone Next.js app that builds and deploys independently.

```
MyHomeApp/
├── packages/
│   └── shared/                    # npm workspace package
│       ├── package.json
│       ├── components/            # Modal, Button, Card, Tabs, etc.
│       ├── styles/                # globals.css, CSS vars, theme
│       ├── lib/                   # data.ts, readJsonFile, writeJsonFile
│       └── models/                # ApiResponse, SubApp, AutomatedTask
│
├── apps/
│   ├── portal/                    # Dashboard + nav (tiny app)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/                   # index.tsx, Layout, SubAppCard
│   │
│   ├── anime/                     # Anime subapp
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/                   # pages, api, components, models, hooks
│   │
│   ├── savings/                   # Savings subapp
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/                   # pages, api, components, models, hooks  
│   │
│   └── rag/                       # RAG subapp
│       ├── package.json
│       ├── Dockerfile
│       └── src/
│
├── docker-compose.yml             # Portal app
├── docker-compose.anime.yml       # Anime + its cron
├── docker-compose.savings.yml     # Savings + its cron
├── docker-compose.rag.yml         # RAG + qdrant + docling + its cron
├── package.json                   # Root workspace config
└── pnpm-workspace.yaml
```

### Routing Strategy

Each app runs on its own port. The portal app uses **Next.js `rewrites`** to proxy to the other apps — no extra container needed:

```
/              → portal:3000        (served directly)
/anime/*       → anime:3001         (proxied via rewrite)
/savings/*     → savings:3002       (proxied via rewrite)
/rag/*         → rag:3003           (proxied via rewrite)
```

```javascript
// apps/portal/next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: '/anime/:path*', destination: 'http://anime:3001/anime/:path*' },
      { source: '/api/anime/:path*', destination: 'http://anime:3001/api/anime/:path*' },
      { source: '/savings/:path*', destination: 'http://savings:3002/savings/:path*' },
      { source: '/api/savings/:path*', destination: 'http://savings:3002/api/savings/:path*' },
      { source: '/rag/:path*', destination: 'http://rag:3003/rag/:path*' },
      { source: '/api/rag/:path*', destination: 'http://rag:3003/api/rag/:path*' },
    ];
  }
};
```

#### Local Development

For local dev, each app can run standalone on its own port (e.g. `http://localhost:3001/anime`). The portal rewrites use **environment variables** for destination URLs so they resolve to `localhost:300X` locally and `container-name:300X` in Docker:

```javascript
// apps/portal/next.config.js
const ANIME_URL = process.env.ANIME_URL || 'http://localhost:3001';
const SAVINGS_URL = process.env.SAVINGS_URL || 'http://localhost:3002';
const RAG_URL = process.env.RAG_URL || 'http://localhost:3003';
```

You can also run a single subapp in isolation without the portal at all — just navigate to `http://localhost:3001/anime` directly.

### Cron / Jobs Strategy

Each app gets its **own cron container** inside its own docker-compose file. This keeps everything self-contained — deploying or tearing down a subapp automatically includes its scheduled jobs.

```yaml
# docker-compose.anime.yml
services:
  anime:
    # ...app config...
  anime-cron:
    image: alpine:latest
    depends_on: [anime]
    command: >-
      sh -c "apk add --no-cache curl &&
      echo '0 2 * * * curl -X POST -H \"Authorization: Bearer $$CRON_SECRET\" 
      http://anime:3000/api/actions/perform-tasks' > /etc/crontabs/root &&
      crond -f -d 8"
    restart: unless-stopped
```

Each subapp exposes its own `/api/actions/perform-tasks` endpoint that only runs its own tasks (anime sync, savings snapshots, etc.). The current monolithic `perform-automated-tasks.ts` gets split during migration.

### Shared Package

The `packages/shared` package is consumed via workspace protocol:

```json
// apps/anime/package.json
{
  "dependencies": {
    "@myhomeapp/shared": "workspace:*"
  }
}
```

Imports become:
```typescript
import { Modal, Button, Card } from '@myhomeapp/shared/components';
import { readJsonFile, writeJsonFile } from '@myhomeapp/shared/lib';
import { globals } from '@myhomeapp/shared/styles';
```

### Docker Strategy

Each app gets its own Dockerfile (they're nearly identical — the base `Dockerfile` just needs the app name parameterized). Each compose file builds and runs one app:

```yaml
# docker-compose.anime.yml
services:
  anime:
    build: 
      context: .
      dockerfile: apps/anime/Dockerfile
    ports:
      - "3001:3000"
    volumes:
      - /volume4/.../database/anime:/app/data
```

### What changes

| Step | Effort | Description |
|------|--------|-------------|
| 1 | Infrastructure | Create branch, deploy side-by-side Portainer stack |
| 2 | Setup | Init pnpm workspaces, create `packages/shared` |
| 3 | Extract shared | Move shared components, styles, lib, models to package |
| 4 | Split anime | Move anime code to `apps/anime/`, update imports |
| 5 | Split savings | Move savings code to `apps/savings/`, update imports |
| 6 | Split rag | Move rag code to `apps/rag/`, update imports |
| 7 | Portal app | Create minimal dashboard app with rewrites |
| 8 | Docker | Create per-app Dockerfiles + compose files |
| 9 | Cron | Split cron into per-subapp triggers |

**Estimated effort: 2-3 focused sessions.**

### Pros

| ✅ | Detail |
|----|--------|
| Full build isolation | RAG failing to build doesn't affect anime or savings |
| Full deploy isolation | Each subapp is an independent Portainer stack |
| AI context reduction | When working on anime, Copilot only sees anime + shared code |
| Shared code stays shared | `@myhomeapp/shared` package, single source of truth |
| Independent scaling | Can give more resources to savings (yahoo-finance) vs anime |
| Independent dependencies | RAG gets pdf-parse, savings gets yahoo-finance2, no cross-contamination |
| Git-friendly | Can still use one repo, one git history |
| Incremental migration | Can split one app at a time; others keep working |

### Cons

| ❌ | Detail |
|----|--------|
| Migration effort | Need to move files, update all imports, test each app |
| More Docker images | 3-4 images instead of 1 (more disk on NAS) |
| Cross-app navigation | Need proxy/rewrites for seamless URL experience |
| Shared package maintenance | Changes to shared package need rebuild of consuming apps |
| Dev experience | `pnpm dev` needs to orchestrate multiple apps (solvable with Turborepo) |
| Port management | Each app on different port; proxy handles external access |

---

## Decided Configuration

| Decision | Choice | Notes |
|----------|--------|-------|
| Package manager | **pnpm** | Faster, disk-efficient, strict dependency isolation |
| Routing | **Next.js rewrites** | Portal proxies to subapps; env vars for local/Docker URLs |
| Shared styles | **Shared package exports** | `@myhomeapp/shared` exports `globals.css`, all apps import it |
| Data volumes | **Split per-app** | Each app mounts only its own data subdirectory |
| Cron | **Per-app cron container** | Each docker-compose includes its own cron sidecar |

---

## pnpm Primer

Since this is a new tool for us, here's what you need to know:

### What is pnpm?

pnpm is a drop-in replacement for npm. Same commands, same `package.json`, but with two key differences that matter for us:

1. **Efficient disk usage** — Instead of duplicating `node_modules` in every app, pnpm stores packages once globally and creates hard links. With 4 Next.js apps sharing React, Next, TypeScript etc., this saves gigabytes.
2. **Strict dependency isolation** — An app can only `import` packages listed in its own `package.json`. This means `apps/anime` literally cannot import `yahoo-finance2` (a savings dependency) by accident. With npm, any package installed anywhere in `node_modules` is importable from everywhere.

### How workspaces work

A workspace is just "multiple package.json files in one repo, managed together." You declare which folders are workspaces:

```yaml
# pnpm-workspace.yaml (at repo root)
packages:
  - 'packages/*'
  - 'apps/*'
```

This tells pnpm: "every folder under `packages/` and `apps/` that has a `package.json` is an independent project."

### Day-to-day commands

| What you want | npm equivalent | pnpm command |
|---------------|----------------|-------------|
| Install everything | `npm install` | `pnpm install` |
| Add a dep to anime | `cd apps/anime && npm i recharts` | `pnpm add recharts --filter anime` |
| Run anime dev server | `cd apps/anime && npm run dev` | `pnpm --filter anime dev` |
| Run ALL dev servers | — | `pnpm -r dev` (recursive) |
| Run build for one app | `cd apps/anime && npm run build` | `pnpm --filter anime build` |

The `--filter` flag is the key concept: it targets a specific workspace by name (the `"name"` field in that app's `package.json`).

### How `@myhomeapp/shared` works

The shared package declares itself:
```json
// packages/shared/package.json
{ "name": "@myhomeapp/shared", "version": "0.0.1" }
```

Each app depends on it using the workspace protocol:
```json
// apps/anime/package.json
{ "dependencies": { "@myhomeapp/shared": "workspace:*" } }
```

`workspace:*` means "use whatever version is in my monorepo right now" — no publishing, no registry. When you edit a shared component, all apps see the change immediately (pnpm symlinks the package). In Docker builds, pnpm copies the actual files.

### Lock file

pnpm uses `pnpm-lock.yaml` instead of `package-lock.json`. Same concept, different format. It's committed to git.

### Installation

```bash
npm install -g pnpm
```

That's it. Works everywhere npm works, including Docker (`node:18-alpine` + `npm install -g pnpm`).

---

## Migration Plan

Each step produces a working system. If we stop after any step, the app continues to function.

| Step | Description | Deliverable |
|------|-------------|-------------|
| **1** | Set up pnpm workspace structure | Root `pnpm-workspace.yaml`, `packages/shared/` with extracted shared code |
| **2** | Split anime | `apps/anime/` — standalone Next.js app with its own Dockerfile + compose |
| **3** | Split savings | `apps/savings/` — includes filesystem sub-routing (`/savings/[accountId]`) |
| **4** | Split RAG | `apps/rag/` — includes qdrant + docling in its compose |
| **5** | Create portal | `apps/portal/` — dashboard + rewrites to all subapps |
| **6** | Clean up | Remove old monolith code, update copilot-instructions per app |

### Order rationale

- **Anime first**: simplest (SPA, no sub-routing, no special npm deps)
- **Savings second**: slightly harder (filesystem sub-routes under `/savings/`)
- **RAG third**: WIP anyway, least to lose if something breaks
- **Portal last**: needs all apps running to configure rewrites

### AI Context Optimization

With the monorepo, each app gets its own `.github/copilot-instructions.md` scoped to that app's domain. When working on anime, open only `apps/anime/` as the VS Code workspace folder — Copilot sees ~10 files instead of ~80+.
