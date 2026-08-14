#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN:?set DOMAIN to the domain whose A records point at the host EIP}"

source "$(dirname "$0")/common.sh"

docker build --platform linux/amd64 -f packages/api/Dockerfile -t igsn-api:preprod .
docker build --platform linux/amd64 -f packages/admin/Dockerfile \
	--build-arg VITE_API_URL="https://igsn-api.$DOMAIN" \
	--build-arg VITE_OIDC_AUTHORITY="https://sso-test.earth-data.fr/realms/gaia-data" \
	--build-arg VITE_OIDC_CLIENT_ID="formaterre-igsn" \
	--build-arg VITE_FRONTEND_URL="https://igsn.$DOMAIN" \
	--build-arg VITE_UPLOAD_LIMIT="${UPLOAD_LIMIT:-5}" \
	--build-arg VITE_SAMPLE_LOCK_POLL_SECONDS="${SAMPLE_LOCK_POLL_SECONDS:-30}" \
	-t igsn-admin:preprod .
docker build --platform linux/amd64 -f packages/frontend/Dockerfile \
	--build-arg VITE_API_URL="https://igsn-api.$DOMAIN" -t igsn-frontend:preprod .

ssh_open
trap ssh_close EXIT

ssh $SSH_OPTS "$SSH_USER@$HOST" \
	'cloud-init status --wait >/dev/null 2>&1 || true; until docker compose version >/dev/null 2>&1; do sleep 5; done'

docker save igsn-api:preprod igsn-admin:preprod igsn-frontend:preprod \
	| gzip | ssh $SSH_OPTS "$SSH_USER@$HOST" 'docker load'

scp $SSH_OPTS infra/preprod/docker-compose.yml infra/preprod/Caddyfile "$SSH_USER@$HOST:~/"

ssh $SSH_OPTS "$SSH_USER@$HOST" \
	'docker compose --env-file docker-compose.env -f docker-compose.yml up -d --remove-orphans \
	 && docker compose --env-file docker-compose.env -f docker-compose.yml up -d --force-recreate --no-deps api admin frontend caddy'

echo "Deployed. https://igsn.$DOMAIN  https://igsn-admin.$DOMAIN  https://igsn-api.$DOMAIN"
