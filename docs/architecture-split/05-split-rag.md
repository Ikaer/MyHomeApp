# Step 5: Split RAG Subapp

**Branch**: `migration/monorepo`  
**Depends on**: Step 4 completed and validated  
**Checkpoint**: RAG runs as a standalone Next.js app with Qdrant and Docling sidecar in its own docker-compose.

---

## Goal

Extract the RAG subapp into `apps/rag/` — including all its heavy external infrastructure (Qdrant vector DB, Docling PDF sidecar, Ollama connection). This is the subapp that motivated the split in the first place — its dependencies previously broke the monolith build.

---

## Key Differences from Previous Splits

| Concern | Anime/Savings | RAG |
|---------|--------------|-----|
| Extra npm deps | `recharts`, `yahoo-finance2` | `pdf-parse`, `pdf2pic` |
| System deps (Docker) | None | `poppler-utils` (for pdf2pic) |
| External services | None | Qdrant, Docling sidecar, Ollama |
| Lib complexity | 1-4 files | 17 files (`src/lib/rag/`) |
| Stability | Stable | 🚧 WIP |
| docker-compose services | App + cron | App + cron + qdrant + docling-sidecar |

---

## Tasks

### 5.1 — Create the RAG app skeleton

```
apps/rag/
├── package.json
├── next.config.js
├── tsconfig.json
├── docling-sidecar/           ← Moved from project root
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
└── src/
    ├── pages/
    │   ├── _app.tsx
    │   ├── _document.tsx
    │   └── rag.tsx
    ├── components/
    ├── models/
    └── lib/
```

```json
// apps/rag/package.json
{
  "name": "@myhomeapp/rag",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "pdf-parse": "^2.4.5",
    "pdf2pic": "^3.2.0",
    "@myhomeapp/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/pdf-parse": "^1.1.5",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### 5.2 — Move RAG files

| Source | Destination |
|--------|-------------|
| `src/pages/rag.tsx` | `apps/rag/src/pages/rag.tsx` |
| `src/pages/api/rag/**` | `apps/rag/src/pages/api/rag/**` |
| `src/components/rag/**` | `apps/rag/src/components/rag/**` |
| `src/models/rag/**` | `apps/rag/src/models/rag/**` |
| `src/lib/rag/**` | `apps/rag/src/lib/rag/**` |
| `docling-sidecar/` | `apps/rag/docling-sidecar/` |

### 5.3 — Create RAG-specific `_app.tsx`

```tsx
// apps/rag/src/pages/_app.tsx
import { AppProps } from 'next/app';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

### 5.4 — Create RAG-specific automated tasks endpoint (if needed)

RAG currently has no cron tasks in `perform-automated-tasks.ts`. If no background jobs are needed, skip the cron container entirely. It can be added later when RAG needs scheduled ingestion or index maintenance.

If a cron is needed later:
```typescript
// apps/rag/src/pages/api/actions/perform-tasks.ts
// Future: scheduled re-indexing, cleanup, etc.
```

### 5.5 — Update imports

| Old import | New import |
|-----------|------------|
| `from '@/components/shared'` | `from '@myhomeapp/shared/components'` |
| `from '@/lib/data'` | `from '@myhomeapp/shared/lib/data'` |
| `from '@/models/shared'` | `from '@myhomeapp/shared/models'` |
| `from '@/components/rag'` | `from '@/components/rag'` (stays) |
| `from '@/lib/rag'` | `from '@/lib/rag'` (stays) |

### 5.6 — Create Dockerfile

```dockerfile
# apps/rag/Dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/rag/package.json ./apps/rag/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ARG BUILD_DATE=default
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/rag/node_modules ./apps/rag/node_modules
COPY packages/shared ./packages/shared
COPY apps/rag ./apps/rag
COPY pnpm-workspace.yaml package.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @myhomeapp/rag build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Required by pdf2pic (pdftoppm for scanned PDF → image)
RUN apk add --no-cache poppler-utils

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/rag/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/rag/.next/static ./apps/rag/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/rag/public ./apps/rag/public
RUN mkdir -p /app/data /app/config /app/logs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/rag/server.js"]
```

### 5.7 — Create docker-compose.rag.yml

This is the most complex compose file — it bundles the RAG app, Qdrant, and the Docling sidecar:

```yaml
version: '3.8'

services:
  rag:
    image: myhomeapp-rag:${BUILD_VERSION:-latest}
    build:
      context: .
      dockerfile: apps/rag/Dockerfile
      args:
        - BUILD_DATE=2026-03-04-v1
    ports:
      - "12353:3000"
    volumes:
      - /volume4/root4/AppData/MyHomeApp-v2/database/rag:/app/data
      - /volume4/root4/AppData/MyHomeApp-v2/config:/app/config
      - /volume4/root4/AppData/MyHomeApp-v2/logs/rag:/app/logs
      - /volume1:/nas/volume1:ro
      - /volume2:/nas/volume2:ro
      - /volume3:/nas/volume3:ro
      - /volume4:/nas/volume4:ro
      - /volume5:/nas/volume5:ro
    environment:
      - NODE_ENV=production
      - DATA_PATH=/app/data
      - CONFIG_PATH=/app/config
      - LOGS_PATH=/app/logs
      - QDRANT_URL=http://rag-qdrant:6333
      - OLLAMA_URL=http://192.168.1.19:11434
      - DOCLING_URL=http://rag-docling:8000
    restart: unless-stopped
    container_name: myhomeapp-v2-rag
    user: "0:0"

  rag-qdrant:
    image: qdrant/qdrant:latest
    container_name: myhomeapp-v2-qdrant
    ports:
      - "6334:6333"
    volumes:
      - /volume4/root4/AppData/MyHomeApp-v2/qdrant:/qdrant/storage
    restart: unless-stopped

  rag-docling:
    build:
      context: ./apps/rag/docling-sidecar
    container_name: myhomeapp-v2-docling
    ports:
      - "8001:8000"
    restart: unless-stopped

  # RAG has no cron tasks currently, but the service is here as a placeholder
  # Uncomment when scheduled ingestion/maintenance is needed:
  # rag-cron:
  #   image: alpine:latest
  #   depends_on: [rag]
  #   command: ...
  #   restart: unless-stopped
  #   container_name: myhomeapp-v2-rag-cron
```

### 5.8 — NAS volume mounts

RAG needs read-only access to NAS volumes for document ingestion. These `/volume1-5` mounts move from the monolith to the RAG compose only — anime and savings don't need them.

---

## Files Inventory

### RAG-specific files being moved (complete list)

**Pages:**
- `rag.tsx` (main page)

**API Routes (4 files):**
- `api/rag/preview.ts`
- `api/rag/query.ts`
- `api/rag/ingest/index.ts`
- `api/rag/ingest/preview-file.ts`
- `api/rag/ingest/[jobId].ts`

**Components:**
- `components/rag/index.ts`
- `components/rag/RagPageLayout.tsx` + `.module.css` + `.d.ts`
- `components/rag/chat/ChatInterface.tsx` + `.module.css` + `.d.ts`
- `components/rag/chat/IngestPanel.tsx` + `.module.css` + `.d.ts`
- `components/rag/chat/SourceReferences.tsx` + `.module.css` + `.d.ts`
- `components/rag/chat/index.ts`
- `components/rag/ingest-preview/IngestPreview.tsx` + `.module.css` + `.d.ts`
- `components/rag/ingest-preview/index.ts`

**Models:**
- `models/rag/index.ts`

**Lib (17 files):**
- `lib/rag/index.ts`
- `lib/rag/animeDataExtractor.ts`
- `lib/rag/chunker.ts`
- `lib/rag/contextGenerator.ts`
- `lib/rag/docIdentifierExtractor.ts`
- `lib/rag/embedder.ts`
- `lib/rag/hydeGenerator.ts`
- `lib/rag/ingestor.ts`
- `lib/rag/jobStore.ts`
- `lib/rag/manifest.ts`
- `lib/rag/promptBuilder.ts`
- `lib/rag/qdrantClient.ts`
- `lib/rag/queryFilterExtractor.ts`
- `lib/rag/ragConfig.ts`
- `lib/rag/structuredDataExtractor.ts`
- `lib/rag/textExtractor.ts`
- `lib/rag/visionExtractor.ts`

**Docling Sidecar:**
- `docling-sidecar/Dockerfile`
- `docling-sidecar/main.py`
- `docling-sidecar/requirements.txt`

---

## Checkpoint Validation

- [ ] `pnpm --filter @myhomeapp/rag build` succeeds
- [ ] `pnpm --filter @myhomeapp/rag dev` starts on port 3003
- [ ] `http://localhost:3003/rag` loads the RAG page
- [ ] RAG API routes respond (query, ingest)
- [ ] Docker build: `docker compose -f docker-compose.rag.yml build`
- [ ] Docker run: all 3 containers start (rag, qdrant, docling)
- [ ] Qdrant is reachable from rag container
- [ ] Docling health check: `curl http://localhost:8001/health`
- [ ] Document ingestion works end-to-end
- [ ] Query returns results from Qdrant
- [ ] Commit: `migration(step-5): extract rag subapp`
- [ ] Push to `migration/monorepo`
- [ ] Deploy `myhomeapp-v2-rag` stack in Portainer
- [ ] Tag: `git tag migration-step-5-validated`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Docling sidecar build fails on NAS | Already worked (or didn't) in monolith — same Dockerfile, now just in a different path |
| `pdf-parse`/`pdf2pic` install fails | These are now isolated to RAG — if they fail, anime and savings are unaffected (the entire point of the split) |
| `lib/rag/animeDataExtractor.ts` imports anime models | Check for cross-subapp imports; if it needs anime types, move those types to shared or create a lightweight interface |
| Qdrant network unreachable | Container names changed (`rag-qdrant` instead of `qdrant`); update `QDRANT_URL` env var accordingly |
| NAS volume mounts only in RAG compose | Anime and savings don't need NAS access — only RAG does for document ingestion |
