FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY cms/package.json cms/package-lock.json ./
RUN --mount=type=cache,id=avgst-cms-npm,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --no-audit --no-fund

# Temporary: Dokploy always starts the stage named runner and ignores the
# container command. This stage applies Payload migrations and then exits.
FROM dependencies AS runner
WORKDIR /app/cms
COPY cms/ ./
COPY src/lib/ /app/src/lib/
USER root
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
USER node
CMD ["sh", "-c", "mkdir -p /app/media/.db-backups && pg_dump \"$DATABASE_URL\" -Fc -f /app/media/.db-backups/cms-20261014.dump && echo BACKUP_OK && node scripts/mark-initial-migration.mjs && npm run migrate; echo MIGRATE_EXIT:$?; sleep 180"]

FROM runner AS operations
CMD ["sh", "-c", "mkdir -p /app/media/.db-backups && pg_dump \"$DATABASE_URL\" -Fc -f /app/media/.db-backups/cms-20261014.dump && echo BACKUP_OK && node scripts/mark-initial-migration.mjs && npm run migrate; echo MIGRATE_EXIT:$?; sleep 180"]
