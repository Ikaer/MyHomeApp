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
COPY packages/shared ./packages/shared
COPY apps/anime ./apps/anime
COPY pnpm-workspace.yaml package.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @myhomeapp/anime build
RUN mkdir -p /app/apps/anime/public

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
