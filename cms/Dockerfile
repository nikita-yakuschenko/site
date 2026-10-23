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
COPY src/data/webp-assets.json /app/src/data/webp-assets.json
# Disposable build-only values: dynamic routes never connect to this database.
# Runtime secrets are required separately; none are persisted as image ENV.
RUN --mount=type=cache,id=avgst-cms-next,target=/app/.next/cache,sharing=locked \
    PAYLOAD_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))')" \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    CMS_PUBLIC_URL=https://cms.avgst.ru npm run build

# One image for the site and for the one-off migration. The default command is the web server.
FROM base AS release
ARG CMS_REVISION=unknown
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 CMS_REVISION=$CMS_REVISION
LABEL org.opencontainers.image.source=https://github.com/nikita-yakuschenko/site \
      org.opencontainers.image.revision=$CMS_REVISION
COPY --from=builder --chown=node:node /app/cms/.next/standalone ./
COPY --from=builder --chown=node:node /app/cms/.next/static ./cms/.next/static
COPY --from=builder --chown=node:node /app/cms/public ./cms/public
COPY --chown=node:node cms /opt/release/cms
COPY --from=dependencies --chown=node:node /app/node_modules /opt/release/cms/node_modules
COPY --chown=node:node package.json /opt/release/package.json
COPY --chown=node:node src/lib /opt/release/src/lib
COPY --chown=node:node src/data/webp-assets.json /opt/release/src/data/webp-assets.json
RUN ln -s /opt/release/cms/node_modules /opt/release/node_modules \
 && mkdir -p /app/media \
 && chown node:node /app/media \
 && chmod 755 /opt/release/cms/docker/entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/opt/release/cms/docker/entrypoint.sh"]
CMD ["serve"]
