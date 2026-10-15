#!/bin/sh
# serve — веб-сервер. migrate — одноразовая миграция без HTTP.
set -eu
mode="${1:-serve}"
case "$mode" in
  serve)
    cd /app
    exec node cms/server.js
    ;;
  migrate)
    cd /opt/release/cms
    exec node scripts/release-migrate.mjs
    ;;
  bootstrap)
    cd /opt/release/cms
    exec node scripts/bootstrap-migration-history.mjs
    ;;
  *)
    echo "Неизвестный режим контейнера: $mode" >&2
    exit 64
    ;;
esac
