#!/usr/bin/env bash
set -euo pipefail

service=avgst-passports.service
site_service=${1:-avgst-site-ztuevj}
revisions=/opt/avgst-passport-revisions
dropin=/etc/systemd/system/$service.d

mkdir -p "$revisions"
exec 9>"$revisions/sync.lock"
flock -n 9 || exit 0

container=$(docker ps --filter "label=com.docker.swarm.service.name=$site_service" --filter health=healthy --format '{{.ID}}' | head -n 1)
[[ -n "$container" ]] || exit 0
storage=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/avgst/passports"}}{{.Source}}{{end}}{{end}}' "$container")
[[ "$storage" == /var/lib/avgst/passports-next ]]
revision=$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$container")
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
target="$revisions/$revision"
current=$(systemctl show -p WorkingDirectory --value "$service")
if [[ "$current" == "$target" ]] && systemctl is-active --quiet "$service"; then exit 0; fi

if [[ ! -d "$target" ]]; then
  stage=$(mktemp -d "$revisions/.stage.XXXXXXXX")
  trap 'if [[ -d "$stage" ]]; then rm -rf -- "$stage"; fi' EXIT
  mkdir -p "$stage/scripts" "$stage/public"
  for item in src passports scripts/passports public/logo.svg public/logo_lg.svg public/social; do
    docker cp "$container:/app/$item" "$stage/$item"
  done
  ln -s /opt/avgst-passports/node_modules "$stage/node_modules"
  printf '{"type":"module"}\n' > "$stage/package.json"
  test -f "$stage/scripts/passports/worker.ts"
  test -f "$stage/node_modules/tsx/dist/cli.mjs"
  revision_script='import { contentRevision } from "./src/lib/passports/storage.ts"; console.log(await contentRevision())'
  site_hash=$(docker exec -w /app "$container" node --experimental-strip-types --input-type=module -e "$revision_script")
  worker_hash=$(cd "$stage" && /opt/avgst-node/bin/node --experimental-strip-types --input-type=module -e "$revision_script")
  [[ "$site_hash" == "$worker_hash" ]]
  mv "$stage" "$target"
fi

# Stop the previous process before moving its lease out of the shared queue.
systemctl stop "$service"
if [[ -d "$storage/worker.lock" ]]; then
  mv "$storage/worker.lock" "$storage/.worker-lock-$(date +%s%N)"
fi
mkdir -p "$dropin"
printf '[Service]\nWorkingDirectory=%s\n' "$target" > "$dropin/10-site-revision.conf"
systemctl daemon-reload
systemctl start "$service"
printf 'Passport worker switched to %s\n' "$revision"
