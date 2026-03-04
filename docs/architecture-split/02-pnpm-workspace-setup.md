# Step 2: Set Up pnpm Workspace + Extract Shared Package

**Branch**: `migration/monorepo`  
**Depends on**: Step 1 completed and validated  
**Checkpoint**: The existing monolith still builds and runs as a single app, but the repo is now a pnpm workspace and `packages/shared` exists.

---

## Goal

Convert the repo from a single npm project to a pnpm workspace monorepo. Extract code shared across subapps into `packages/shared`. At the end of this step, the monolith still works exactly as before — it just consumes shared code from a local workspace package instead of relative imports.

---

## Prerequisites

- [ ] Create branch `migration/monorepo` from `main`
- [ ] Install pnpm globally: `npm install -g pnpm`

---

## Tasks

### 2.1 — Initialize pnpm workspace

Create the root workspace config:

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

Create the directory structure:

```
mkdir packages/shared
mkdir apps
```

### 2.2 — Convert root to pnpm

```bash
# Remove npm lock file (pnpm will create its own)
rm package-lock.json

# Install dependencies with pnpm
pnpm install
```

Update root `package.json` — keep existing scripts for now (the monolith still lives at root during step 2):

```jsonc
// Add to package.json
{
  "packageManager": "pnpm@9.x"
}
```

### 2.3 — Create `packages/shared` package

```json
// packages/shared/package.json
{
  "name": "@myhomeapp/shared",
  "version": "0.0.1",
  "private": true,
  "main": "index.ts",
  "types": "index.ts"
}
```

### 2.4 — Move shared components

Move these files from `src/components/shared/` to `packages/shared/components/`:

```
packages/shared/components/
├── Button.module.css
├── Button.module.css.d.ts
├── Button.tsx
├── Card.module.css
├── Card.module.css.d.ts
├── Card.tsx
├── CollapsibleSection.module.css
├── CollapsibleSection.module.css.d.ts
├── CollapsibleSection.tsx
├── Modal.module.css
├── Modal.module.css.d.ts
├── Modal.tsx
├── Tabs.module.css
├── Tabs.module.css.d.ts
├── Tabs.tsx
├── index.ts
└── table/
    ├── SortableHeaderButton.module.css
    ├── SortableHeaderButton.module.css.d.ts
    ├── SortableHeaderButton.tsx
    └── index.ts
```

### 2.5 — Move shared styles

```
packages/shared/styles/
└── globals.css          ← from src/styles/globals.css
```

### 2.6 — Move shared lib

Move **only** the truly shared utilities. Subapp-specific libs stay:

```
packages/shared/lib/
└── data.ts              ← from src/lib/data.ts (readJsonFile, writeJsonFile, etc.)
```

**Do NOT move**: `anime.ts`, `animeUtils.ts`, `animeUrlParams.ts`, `providers.ts`, `finance.ts`, `savings.ts`, `rag/*` — these are subapp-specific.

### 2.7 — Move shared models

```
packages/shared/models/
├── index.ts             ← from src/models/shared/index.ts (ApiResponse, SubApp)
└── automatedTasks.ts    ← from src/models/shared/automatedTasks.ts
```

### 2.8 — Create barrel exports

```typescript
// packages/shared/index.ts
export * from './components';
export * from './models';
export * from './lib/data';
```

### 2.9 — Wire up the monolith to consume `@myhomeapp/shared`

Add the workspace dependency to the root `package.json` (the monolith still lives at root):

```json
{
  "dependencies": {
    "@myhomeapp/shared": "workspace:*"
  }
}
```

Run `pnpm install` to create the symlink.

### 2.10 — Update imports in the monolith

Find and replace imports across the codebase. The changes are mechanical:

| Old import | New import |
|-----------|------------|
| `from '@/components/shared'` | `from '@myhomeapp/shared/components'` |
| `from '@/components/shared/Modal'` | `from '@myhomeapp/shared/components/Modal'` |
| `from '@/components/shared/table'` | `from '@myhomeapp/shared/components/table'` |
| `from '@/styles/globals.css'` | `from '@myhomeapp/shared/styles/globals.css'` |
| `from '@/lib/data'` | `from '@myhomeapp/shared/lib/data'` |
| `from '@/models/shared'` | `from '@myhomeapp/shared/models'` |

**Leave alone**: Any import from `@/components/anime`, `@/components/savings`, `@/lib/anime`, `@/models/anime`, etc. — those stay as `@/` for now.

### 2.11 — Update tsconfig.json

Add a path alias for the shared package so TypeScript resolves it:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@myhomeapp/shared/*": ["./packages/shared/*"]
    }
  }
}
```

### 2.12 — Update Dockerfile

The Dockerfile needs to copy `packages/shared` into the build context:

```dockerfile
# In the builder stage, after COPY . .
# pnpm workspace needs all package.json files first
COPY pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
```

Also update the base to install pnpm:

```dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm
```

Replace `npm ci` with `pnpm install --frozen-lockfile` in the deps stage.

### 2.13 — Test

```bash
# Build
pnpm run build

# Dev
pnpm run dev

# Verify in browser: all pages load, no broken imports
```

---

## Files Changed Summary

| Action | Path |
|--------|------|
| **Created** | `pnpm-workspace.yaml` |
| **Created** | `packages/shared/package.json` |
| **Created** | `packages/shared/index.ts` |
| **Moved** | `src/components/shared/*` → `packages/shared/components/*` |
| **Moved** | `src/styles/globals.css` → `packages/shared/styles/globals.css` |
| **Moved** | `src/lib/data.ts` → `packages/shared/lib/data.ts` |
| **Moved** | `src/models/shared/*` → `packages/shared/models/*` |
| **Modified** | `package.json` (added workspace dep, packageManager field) |
| **Modified** | `tsconfig.json` (added shared path alias) |
| **Modified** | `Dockerfile` (pnpm + workspace copy) |
| **Modified** | All files importing from shared (import path updates) |
| **Deleted** | `package-lock.json` (replaced by `pnpm-lock.yaml`) |

---

## Checkpoint Validation

- [ ] `pnpm install` succeeds
- [ ] `pnpm run build` succeeds — no TypeScript errors
- [ ] `pnpm run dev` starts — all pages load
- [ ] Docker build succeeds: `docker build -t myhomeapp-test .`
- [ ] Docker run works: `docker run -p 12399:3000 myhomeapp-test`
- [ ] Commit with message: `migration(step-2): pnpm workspace + shared package`
- [ ] Push to `migration/monorepo`
- [ ] Deploy in Portainer as `myhomeapp-v2` stack, verify all pages work
- [ ] Tag: `git tag migration-step-2-validated`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| pnpm install fails on NAS Docker build | Dockerfile uses `npm install -g pnpm` on node:18-alpine, well-supported |
| CSS module imports break from new path | shared package re-exports everything through barrel files — same interface |
| Next.js standalone output doesn't include workspace packages | Next.js `outputFileTracingRoot` handles this — may need to set it to repo root |
