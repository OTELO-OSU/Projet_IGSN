#!/usr/bin/env bash
# Deploy the IGSN stack to the preprod EC2 host from your laptop.
#
# Builds the three images and ships them + docker-compose.yml over SSH.
# :22 is opened for your current IP and revoked on exit. Your SSH key must
# already be installed on the host (run `make preprod-ssh-send-key` once).
# Migrations gate the api. The env file (docker-compose.env) is NOT shipped:
# copy it yourself.
#
# Prereqs: docker, aws CLI, ssh/scp, an SSH key at ~/.ssh/id_ed25519.pub (or set
# SSH_PUBLIC_KEY) installed via `make preprod-ssh-send-key`, AWS creds allowing
# ec2:{Authorize,Revoke}SecurityGroupIngress, plus read of the tofu state.
# DNS A records for {igsn.,igsn-admin.,igsn-api.,igsn-auth.,igsn-idp.}$DOMAIN must point at the host EIP.
# The host docker-compose.env must set KEYCLOAK_PASSWORD (Keycloak admin + SAML users).
#
# Usage:  make preprod-deploy DOMAIN=<domain>   (or: DOMAIN=... infra/preprod/scripts/deploy.sh)
set -euo pipefail

: "${DOMAIN:?set DOMAIN to the domain whose A records point at the host EIP}"

# Shared infra outputs + SSH-access helpers (also cd's to the repo root).
source "$(dirname "$0")/common.sh"

# 1. Build for the host arch (AL2023 is x86_64).
docker build --platform linux/amd64 -f packages/api/Dockerfile -t igsn-api:preprod .
docker build --platform linux/amd64 -f packages/admin/Dockerfile \
	--build-arg VITE_API_URL="https://igsn-api.$DOMAIN" \
	--build-arg VITE_OIDC_AUTHORITY="https://igsn-auth.$DOMAIN/realms/igsn" \
	--build-arg VITE_FRONTEND_URL="https://igsn.$DOMAIN" \
	-t igsn-admin:preprod .
docker build --platform linux/amd64 -f packages/frontend/Dockerfile \
	--build-arg VITE_API_URL="https://igsn-api.$DOMAIN" -t igsn-frontend:preprod .

# 2. Open :22 to this laptop only; revoke on exit.
ssh_open
trap ssh_close EXIT

# 2b. On a fresh host, cloud-init may still be installing Docker + the compose
# plugin. Wait for both before shipping, or the first deploy hits "docker: not
# found". No-op on a warm host.
ssh $SSH_OPTS "$SSH_USER@$HOST" \
	'cloud-init status --wait >/dev/null 2>&1 || true; until docker compose version >/dev/null 2>&1; do sleep 5; done'

# 3. Ship images. docker load reads the gzipped stream directly.
docker save igsn-api:preprod igsn-admin:preprod igsn-frontend:preprod \
	| gzip | ssh $SSH_OPTS "$SSH_USER@$HOST" 'docker load'

# 4. Ship the compose file, Caddyfile, and the auth import dirs the compose bind-
# mounts (keycloak realms + the SAML IdP users). Not the env file: you copy that.
scp $SSH_OPTS infra/preprod/docker-compose.yml infra/preprod/Caddyfile "$SSH_USER@$HOST:~/"
scp -r $SSH_OPTS keycloak saml-idp "$SSH_USER@$HOST:~/"

# 5. Roll out. `up -d` blocks on migrate (service_completed_successfully) and
# aborts if migrations fail before starting the api. Reads env from the
# docker-compose.env you copied to the host.
#
# Then force-recreate the app services (so they always run the images we just
# `docker load`ed) plus caddy (so it always picks up the freshly shipped
# Caddyfile). Compose skips recreate when nothing it detects changed, which
# serves stale code/config. --no-deps scopes it to these, leaving
# postgres/keycloak/saml-idp (ephemeral state) untouched.
ssh $SSH_OPTS "$SSH_USER@$HOST" \
	'docker compose --env-file docker-compose.env -f docker-compose.yml up -d --remove-orphans \
	 && docker compose --env-file docker-compose.env -f docker-compose.yml up -d --force-recreate --no-deps api admin frontend caddy'

echo "Deployed. https://igsn.$DOMAIN  https://igsn-admin.$DOMAIN  https://igsn-api.$DOMAIN  https://igsn-auth.$DOMAIN  https://igsn-idp.$DOMAIN"
