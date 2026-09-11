# Многостадийная сборка: в финальный образ едет только рантайм standalone.
FROM node:22.17.0-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- зависимости -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- сборка ------------------------------------------------------------------
FROM base AS builder
ARG APP_VERSION=0.1.0
ARG APP_COMMIT=unknown
ENV APP_VERSION=$APP_VERSION APP_COMMIT=$APP_COMMIT
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- рантайм -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# Процесс не должен работать от root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Дублирует healthcheck Swarm: образ остаётся самопроверяемым и вне Dokploy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
