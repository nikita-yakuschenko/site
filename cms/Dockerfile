FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY cms/package.json cms/package-lock.json ./
RUN --mount=type=cache,id=avgst-cms-npm,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --no-audit --no-fund

FROM dependencies AS builder
WORKDIR /app/cms
COPY cms/ ./
COPY src/lib/ /app/src/lib/
# Disposable build-only values: dynamic routes never connect to this database.
# Runtime secrets are required separately; none are persisted as image ENV.
RUN --mount=type=cache,id=avgst-cms-next,target=/app/.next/cache,sharing=locked \
    PAYLOAD_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))')" \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    CMS_PUBLIC_URL=https://cms.avgst.ru npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/cms/.next/standalone ./
COPY --from=builder --chown=node:node /app/cms/.next/static ./cms/.next/static
COPY --from=builder --chown=node:node /app/cms/public ./cms/public
RUN mkdir -p /app/media && chown node:node /app/media
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Exec form forwards SIGTERM directly to Next.js for graceful shutdown.
CMD ["node", "cms/server.js"]

# Last stage: Dokploy builds the Dockerfile without --target, so this is what a
# git deploy of the CMS app runs. CI still publishes the runner via --target runner.
FROM dependencies AS operations
WORKDIR /app/cms
COPY cms/ ./
COPY src/lib/ /app/src/lib/
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "migrate"]
