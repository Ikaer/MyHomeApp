# Step 4: Split Savings Subapp

**Branch**: `migration/monorepo`  
**Depends on**: Step 3 completed and validated  
**Checkpoint**: Savings runs as a standalone Next.js app on its own port with its own docker-compose.

---

## Goal

Extract the savings subapp into `apps/savings/` — a fully independent Next.js application. This is slightly more complex than anime because savings has **filesystem sub-routing** (`/savings/default.tsx`, `/savings/[accountId].tsx`) and **additional npm dependencies** (`yahoo-finance2`, `recharts`, `xirr`).

---

## Key Differences from Anime Split

| Concern | Anime | Savings |
|---------|-------|---------|
| Routing | Single SPA page | Sub-routing: `/savings`, `/savings/default`, `/savings/[accountId]` |
| Extra npm deps | None | `yahoo-finance2`, `recharts`, `xirr` |
| Docker system deps | None | None |
| Hooks | 1 hook | 5 hooks (dedicated `hooks/savings/` directory) |
| Cron tasks | 1 task (anime sync) | 3 tasks (store assets, accounts, wealth values) |

---

## Tasks

### 4.1 — Create the savings app skeleton

```
apps/savings/
├── package.json
├── next.config.js
├── tsconfig.json
└── src/
    ├── pages/
    │   ├── _app.tsx
    │   ├── _document.tsx
    │   ├── savings.tsx
    │   └── savings/
    │       ├── default.tsx
    │       └── [accountId].tsx
    ├── components/
    ├── models/
    ├── hooks/
    └── lib/
```

```json
// apps/savings/package.json
{
  "name": "@myhomeapp/savings",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^3.7.0",
    "xirr": "^1.1.0",
    "yahoo-finance2": "^3.13.0",
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
// apps/savings/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
}
module.exports = nextConfig;
```

### 4.2 — Move savings files

| Source | Destination |
|--------|-------------|
| `src/pages/savings.tsx` | `apps/savings/src/pages/savings.tsx` |
| `src/pages/savings/default.tsx` | `apps/savings/src/pages/savings/default.tsx` |
| `src/pages/savings/[accountId].tsx` | `apps/savings/src/pages/savings/[accountId].tsx` |
| `src/pages/savings/SavingsLayout.module.css` | `apps/savings/src/pages/savings/SavingsLayout.module.css` |
| `src/pages/savings/SavingsLayout.module.css.d.ts` | `apps/savings/src/pages/savings/SavingsLayout.module.css.d.ts` |
| `src/pages/savings/SavingsPage.module.css` | `apps/savings/src/pages/savings/SavingsPage.module.css` |
| `src/pages/savings/SavingsPage.module.css.d.ts` | `apps/savings/src/pages/savings/SavingsPage.module.css.d.ts` |
| `src/pages/api/savings/**` | `apps/savings/src/pages/api/savings/**` |
| `src/components/savings/**` | `apps/savings/src/components/savings/**` |
| `src/models/savings/**` | `apps/savings/src/models/savings/**` |
| `src/hooks/savings/**` | `apps/savings/src/hooks/savings/**` |
| `src/lib/savings.ts` | `apps/savings/src/lib/savings.ts` |
| `src/lib/finance.ts` | `apps/savings/src/lib/finance.ts` |

### 4.3 — Create savings-specific `_app.tsx`

```tsx
// apps/savings/src/pages/_app.tsx
import { AppProps } from 'next/app';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

### 4.4 — Create savings-specific automated tasks endpoint

```typescript
// apps/savings/src/pages/api/actions/perform-tasks.ts
// Only savings tasks:
// - taskStoreAssetsValues()
// - taskStoreAccountsValues()  
// - taskStoreWealthValues()
```

This endpoint runs only the 3 savings snapshot tasks. Anime's sync does not belong here.

### 4.5 — Handle sub-routing

The savings app has filesystem-based routing that needs to be preserved:

```
/savings          → savings.tsx (overview with net worth banner + account grid)
/savings/default  → savings/default.tsx (redirect to default account)
/savings/[id]     → savings/[accountId].tsx (account detail page)
```

This works naturally in the standalone Next.js app — the filesystem routes under `src/pages/savings/` map correctly. No special configuration needed.

### 4.6 — Update imports

Same pattern as anime:

| Old import | New import |
|-----------|------------|
| `from '@/components/shared'` | `from '@myhomeapp/shared/components'` |
| `from '@/lib/data'` | `from '@myhomeapp/shared/lib/data'` |
| `from '@/models/shared'` | `from '@myhomeapp/shared/models'` |
| `from '@/components/savings'` | `from '@/components/savings'` (stays) |
| `from '@/lib/savings'` | `from '@/lib/savings'` (stays) |
| `from '@/lib/finance'` | `from '@/lib/finance'` (stays) |

### 4.7 — Create Dockerfile

```dockerfile
# apps/savings/Dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/savings/package.json ./apps/savings/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ARG BUILD_DATE=default
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/savings/node_modules ./apps/savings/node_modules
COPY packages/shared ./packages/shared
COPY apps/savings ./apps/savings
COPY pnpm-workspace.yaml package.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @myhomeapp/savings build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/savings/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/savings/.next/static ./apps/savings/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/savings/public ./apps/savings/public
RUN mkdir -p /app/data /app/config /app/logs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/savings/server.js"]
```

### 4.8 — Create docker-compose.savings.yml

```yaml
version: '3.8'

services:
  savings:
    image: myhomeapp-savings:${BUILD_VERSION:-latest}
    build:
      context: .
      dockerfile: apps/savings/Dockerfile
      args:
        - BUILD_DATE=2026-03-04-v1
    ports:
      - "12352:3000"
    volumes:
      - /volume4/root4/AppData/MyHomeApp-v2/database/savings:/app/data
      - /volume4/root4/AppData/MyHomeApp-v2/config:/app/config
      - /volume4/root4/AppData/MyHomeApp-v2/logs/savings:/app/logs
    environment:
      - NODE_ENV=production
      - DATA_PATH=/app/data
      - CONFIG_PATH=/app/config
      - LOGS_PATH=/app/logs
      - CRON_SECRET=mysecretcronjobkey
    restart: unless-stopped
    container_name: myhomeapp-v2-savings
    user: "0:0"

  savings-cron:
    image: alpine:latest
    depends_on:
      - savings
    command: >
      sh -c "apk add --no-cache curl && printf '0 2 * * * curl -X POST -H \"Authorization: Bearer mysecretcronjobkey\" -H \"Content-Type: application/json\" -d \"{\\\"origin\\\":\\\"savings cron job\\\"}\" http://savings:3000/api/actions/perform-tasks\n' > /etc/crontabs/root && crond -f -d 8"
    restart: unless-stopped
    container_name: myhomeapp-v2-savings-cron
```

---

## Files Inventory

### Savings-specific files being moved (complete list)

**Pages (3 + 4 CSS):**
- `savings.tsx` (overview)
- `savings/default.tsx` (redirect)
- `savings/[accountId].tsx` (detail)
- `savings/SavingsLayout.module.css` + `.d.ts`
- `savings/SavingsPage.module.css` + `.d.ts`

**API Routes (13 files):**
- `api/savings/net-worth.ts`
- `api/savings/accounts/index.ts`
- `api/savings/annual/[accountId].ts`
- `api/savings/balances/[accountId].ts`
- `api/savings/deposits/[accountId].ts`
- `api/savings/historical/store-accounts-values.ts`
- `api/savings/historical/store-assets-values.ts`
- `api/savings/historical/accounts/[accountId].ts`
- `api/savings/historical/assets/[assetId].ts`
- `api/savings/historical/general/wealth.ts`
- `api/savings/summary/[accountId].ts`
- `api/savings/transactions/[accountId].ts`

**Components (25+ files):**
- `BalanceAccountDetails.tsx`
- `CreateAccountModal.tsx`
- `InteressementDetails.tsx`
- `RecordBalanceModal.tsx`
- `SavingsAccountDetails.tsx`
- `SavingsShared.module.css` + `.d.ts`
- `account-details/AccountHeaderActions.tsx` + `.module.css` + `.d.ts`
- `account-details/AllChartsModal.tsx`
- `account-details/AnnualEditorModal.tsx`
- `account-details/AnnualOverviewCard.tsx`
- `account-details/AssetChartsModal.tsx` + `.module.css` + `.d.ts`
- `account-details/GainLossCard.tsx`
- `account-details/PerformanceCard.tsx`
- `account-details/PortfolioValueCard.tsx`
- `account-details/PositionsTable.tsx` + `.module.css` + `.d.ts`
- `account-details/SparklineChart.tsx`
- `account-details/TransactionForm.tsx`
- `account-details/TransactionsTable.tsx`
- `account-details/types.ts`
- `account-details/helpers/annualOverview.ts`
- `account-details/helpers/clipboard.ts`
- `account-details/helpers/mappers.ts`
- `account-details/helpers/sorting.ts`
- `account-details/helpers/xirr.ts`

**Models:**
- `models/savings/index.ts`

**Hooks (5 files):**
- `hooks/savings/useAccountHistory.ts`
- `hooks/savings/useAnnualValueEditor.ts`
- `hooks/savings/useAssetHistory.ts`
- `hooks/savings/useSavingsAccountData.ts`
- `hooks/savings/useTransactionEditor.ts`

**Lib (2 files):**
- `lib/savings.ts`
- `lib/finance.ts`

---

## Checkpoint Validation

- [ ] `pnpm --filter @myhomeapp/savings build` succeeds
- [ ] `pnpm --filter @myhomeapp/savings dev` starts on port 3002
- [ ] `http://localhost:3002/savings` loads the savings overview
- [ ] `http://localhost:3002/savings/default` redirects to default account
- [ ] `http://localhost:3002/savings/[some-id]` loads account detail
- [ ] All account types render: PEA, Interessement, CompteCourant, PEL, LivretA, AssuranceVie
- [ ] Charts render (recharts)
- [ ] Yahoo Finance price fetching works
- [ ] Savings API routes respond (test with requests.http on port 3002)
- [ ] Docker build: `docker compose -f docker-compose.savings.yml build`
- [ ] Docker run: savings container starts, page loads on `:12352`
- [ ] Cron test: `curl -X POST -H "Authorization: Bearer mysecretcronjobkey" http://localhost:12352/api/actions/perform-tasks`
- [ ] Commit: `migration(step-4): extract savings subapp`
- [ ] Push to `migration/monorepo`
- [ ] Deploy `myhomeapp-v2-savings` stack in Portainer
- [ ] Tag: `git tag migration-step-4-validated`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Sub-routing breaks when moved | Next.js filesystem routing is path-based — as long as `pages/savings/` directory structure is preserved, routes work |
| `yahoo-finance2` install fails in Docker | Already works in the existing monolith Dockerfile — same base image |
| `finance.ts` imports break | `finance.ts` only imports from `@/models/savings` and `yahoo-finance2` — straightforward |
| Savings data path changes | Docker compose mounts savings-specific data dir; `DATA_PATH` env var points to it |
