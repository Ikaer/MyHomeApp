FROM node:18-alpine AS base
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY package.json ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Cache busting argument - change this value to force rebuild
ARG BUILD_DATE=default
RUN echo "Build date: $BUILD_DATE" && echo "Timestamp: $(date)" > /tmp/buildinfo

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Force cache invalidation by adding current timestamp to build
RUN echo "Source copied at: $(date)" >> /tmp/buildinfo

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Required by visionExtractor (pdf2pic uses pdftoppm for scanned PDF → image)
RUN apk add --no-cache poppler-utils

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory and set permissions
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create app directories for data, config, and logs
RUN mkdir -p /app/data /app/config /app/logs

# Don't switch to nextjs user - we'll handle this in docker-compose
# USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
