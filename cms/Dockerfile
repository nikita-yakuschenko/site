FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Disposable build-only values: dynamic routes never connect to this database.
# Runtime secrets are required separately; none are persisted as image ENV.
RUN PAYLOAD_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))')" \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    CMS_PUBLIC_URL=https://cms.avgst.ru npm run build

# Explicit maintenance image, built with --target operations. Never deployed.
# Migrations and bootstrap are separate operator commands, not startup hooks.
FROM base AS operations
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "migrate:status"]

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p /app/media && chown node:node /app/media
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Exec form forwards SIGTERM directly to Next.js for graceful shutdown.
CMD ["node", "server.js"]
