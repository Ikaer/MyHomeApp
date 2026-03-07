FROM node:18-alpine AS base
RUN npm install -g pnpm

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/rag/package.json ./apps/rag/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
ARG BUILD_DATE=default
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/rag ./apps/rag
COPY pnpm-workspace.yaml package.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @myhomeapp/rag build
RUN mkdir -p /app/apps/rag/public

# Runner
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
