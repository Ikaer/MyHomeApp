# Step 7: Cleanup & Finalize

**Branch**: `migration/monorepo`  
**Depends on**: Step 6 completed and validated (portal + all subapps working)  
**Checkpoint**: Monolith code removed, all compose files use production ports, merged to `main`.

---

## Goal

Remove the legacy monolith code from the repo, finalize docker-compose files with production port mappings, create per-app Copilot instructions, and merge to `main`.

---

## Tasks

### 7.1 — Remove legacy monolith files

These files at the repo root are no longer needed — all code now lives in `apps/` and `packages/`:

**Delete from root `src/`:**
- `src/pages/` — all pages moved to individual apps
- `src/components/anime/` — moved to `apps/anime/`
- `src/components/savings/` — moved to `apps/savings/`
- `src/components/rag/` — moved to `apps/rag/`
- `src/components/shared/` — moved to `packages/shared/`
- `src/components/Layout.tsx` — moved to `packages/shared/` or `apps/portal/`
- `src/components/SubAppCard.tsx` + CSS — moved to `apps/portal/`
- `src/models/` — split across apps and shared package
- `src/hooks/` — split across apps
- `src/lib/` — split across apps and shared package
- `src/styles/` — moved to `packages/shared/`
- `src/types/` — deprecated, replaced by shared models

**Delete from root:**
- `Dockerfile` (root) — replaced by per-app Dockerfiles
- `startup.sh` — no longer needed
- `docling-sidecar/` — moved to `apps/rag/docling-sidecar/`
- `next.config.js` (root) — replaced by per-app configs
- `tsconfig.json` (root) — replaced by per-app configs (keep a root one for IDE support if needed)
- `package-lock.json` — already replaced by `pnpm-lock.yaml` in step 2

**Keep at root:**
- `package.json` — root workspace config
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `docker-compose.yml` — portal
- `docker-compose.anime.yml`
- `docker-compose.savings.yml`
- `docker-compose.rag.yml`
- `.gitignore`, `.eslintrc.json`, `.env.example`, etc.
- `docs/`
- `data/` — local dev data
- `config/`
- `README.md`
- `ORGANIZATION.md` — update to reflect new structure

### 7.2 — Update docker-compose files for production ports

Switch from v2 test ports to final production ports:

| Service | Test Port (v2) | Production Port |
|---------|---------------|-----------------|
| Portal | `12350:3000` | `12344:3000` (same as old monolith) |
| Anime | `12351:3000` | `12345:3000` |
| Savings | `12352:3000` | `12346:3000` |
| RAG | `12353:3000` | `12347:3000` |
| Qdrant | `6334:6333` | `6333:6333` |
| Docling | `8001:8000` | `8000:8000` |

Update container names: remove `-v2` suffix.

Update volume paths: switch from `MyHomeApp-v2` back to `MyHomeApp` (or keep the new structure if cleaner).

### 7.3 — Update environment variables

Update portal's rewrite URLs to use final container names:

```yaml
# docker-compose.yml (portal)
environment:
  - ANIME_URL=http://myhomeapp-anime:3000
  - SAVINGS_URL=http://myhomeapp-savings:3000
  - RAG_URL=http://myhomeapp-rag:3000
```

### 7.4 — Create per-app Copilot instructions

Each app gets its own scoped instructions file:

```
apps/anime/.github/copilot-instructions.md
apps/savings/.github/copilot-instructions.md
apps/rag/.github/copilot-instructions.md
apps/portal/.github/copilot-instructions.md
```

Each file should contain:
- The app's purpose and scope
- Its directory structure
- Import conventions (what comes from `@myhomeapp/shared` vs `@/`)
- API route patterns
- Component patterns
- Data storage conventions
- How to run/build/test the app

Example for anime:
```markdown
# Anime Subapp — Copilot Instructions

## Scope
This app handles anime tracking with MyAnimeList integration.

## Running
- Dev: `pnpm --filter @myhomeapp/anime dev` (port 3001)
- Build: `pnpm --filter @myhomeapp/anime build`
- Docker: `docker compose -f docker-compose.anime.yml up --build`

## Imports
- Shared components: `from '@myhomeapp/shared/components'`
- Shared lib: `from '@myhomeapp/shared/lib/data'`
- App-specific: `from '@/components/anime'`, `from '@/lib/anime'`

## Data
- JSON files at DATA_PATH (default: /app/data)
- Files: animes_MAL.json, animes_extensions.json, animes_hidden.json, mal_auth.json
```

### 7.5 — Update root README.md

Replace the single-app README with monorepo documentation:

- Overview of the monorepo structure
- How to install (`pnpm install`)
- How to run individual apps
- How to run all apps
- How to build Docker images
- How to deploy to Portainer (one stack per compose file)

### 7.6 — Update ORGANIZATION.md

Reflect the new monorepo structure, package conventions, and deployment model.

### 7.7 — Update root .gitignore

Add workspace-level ignores:

```gitignore
# pnpm
node_modules/
.pnpm-store/

# Next.js (per app)
apps/*/.next/
apps/*/out/

# Build
apps/*/standalone/
```

### 7.8 — Clean up root package.json

The root `package.json` should be minimal — just workspace orchestration:

```json
{
  "name": "myhomeapp",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.x",
  "scripts": {
    "dev": "pnpm -r dev",
    "dev:anime": "pnpm --filter @myhomeapp/anime dev",
    "dev:savings": "pnpm --filter @myhomeapp/savings dev",
    "dev:rag": "pnpm --filter @myhomeapp/rag dev",
    "dev:portal": "pnpm --filter @myhomeapp/portal dev",
    "build": "pnpm -r build",
    "build:anime": "pnpm --filter @myhomeapp/anime build",
    "build:savings": "pnpm --filter @myhomeapp/savings build",
    "build:rag": "pnpm --filter @myhomeapp/rag build",
    "build:portal": "pnpm --filter @myhomeapp/portal build"
  }
}
```

No dependencies at root level — all deps belong to individual apps or the shared package.

---

## Merge to Main

### Pre-merge checklist

- [ ] All 4 apps build independently: `pnpm -r build`
- [ ] All 4 apps run independently in dev mode
- [ ] All 4 Docker images build
- [ ] All Portainer stacks deploy and work
- [ ] Cross-app navigation through portal works
- [ ] Cron jobs trigger successfully for anime and savings
- [ ] No references to old `src/` paths remain
- [ ] Root `src/` directory is deleted

### Merge procedure

1. **Final commit**: `migration(step-7): cleanup and finalize`
2. **Push** to `migration/monorepo`
3. **Deploy one last time** as `myhomeapp-v2` stacks — full validation
4. **Merge** `migration/monorepo` → `main`
5. **Update Portainer stacks**:
   - Delete `myhomeapp-v2-*` test stacks
   - Delete the legacy `myhomeapp` stack
   - Create new stacks from `refs/heads/main`:
     - `myhomeapp-portal` using `docker-compose.yml`
     - `myhomeapp-anime` using `docker-compose.anime.yml`
     - `myhomeapp-savings` using `docker-compose.savings.yml`
     - `myhomeapp-rag` using `docker-compose.rag.yml`
6. **Verify** all stacks work on production ports
7. **Tag**: `git tag v2.0.0-monorepo`
8. **Clean up NAS**: Remove `MyHomeApp-v2` test data directories if data was copied from production

### Rollback (if something goes wrong after merge)

```bash
# Revert the merge on main
git revert -m 1 <merge-commit-hash>
git push

# Re-deploy the legacy monolith stack in Portainer
# Use the pre-merge commit or the revert commit
```

Or simply re-create the legacy stack pointing to the commit before the merge.

---

## Final Repo Structure

```
MyHomeApp/
├── apps/
│   ├── anime/
│   │   ├── .github/copilot-instructions.md
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/anime/
│   │       ├── models/anime/
│   │       ├── hooks/
│   │       └── lib/
│   ├── savings/
│   │   ├── .github/copilot-instructions.md
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/savings/
│   │       ├── models/savings/
│   │       ├── hooks/savings/
│   │       └── lib/
│   ├── rag/
│   │   ├── .github/copilot-instructions.md
│   │   ├── Dockerfile
│   │   ├── docling-sidecar/
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/rag/
│   │       ├── models/rag/
│   │       └── lib/rag/
│   └── portal/
│       ├── .github/copilot-instructions.md
│       ├── Dockerfile
│       ├── next.config.js
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── pages/
│           ├── components/
│           └── lib/
├── packages/
│   └── shared/
│       ├── package.json
│       ├── index.ts
│       ├── components/
│       ├── styles/
│       ├── lib/
│       └── models/
├── docker-compose.yml              # Portal
├── docker-compose.anime.yml        # Anime + cron
├── docker-compose.savings.yml      # Savings + cron
├── docker-compose.rag.yml          # RAG + qdrant + docling
├── package.json                    # Root workspace
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── .gitignore
├── README.md
├── ORGANIZATION.md
└── docs/
    ├── architecture-split-options.md
    └── architecture-split/
        ├── 00-side-by-side-strategy.md
        ├── 01-pnpm-workspace-setup.md
        ├── 02-split-anime.md
        ├── 03-split-savings.md
        ├── 04-split-rag.md
        ├── 05-create-portal.md
        └── 06-cleanup.md
```

---

## Checkpoint Validation (Final)

- [ ] `pnpm install` from clean clone succeeds
- [ ] `pnpm -r build` builds all 4 apps
- [ ] `pnpm -r dev` runs all 4 dev servers
- [ ] Each Docker image builds independently
- [ ] All Portainer stacks deploy on production ports
- [ ] Dashboard shows all subapps
- [ ] Anime: full page + API + cron
- [ ] Savings: overview + account details + all account types + charts + cron
- [ ] RAG: page + ingest + query + Qdrant + Docling
- [ ] Navigation between subapps through portal works seamlessly
- [ ] Merged to `main`
- [ ] Legacy stacks removed
- [ ] Tag: `v2.0.0-monorepo`
