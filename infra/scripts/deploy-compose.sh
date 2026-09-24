#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

ENVIRONMENT="${1:?usage: deploy-compose.sh <prod|preprod>}"
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/igsn-deploy.config}"
REMOTE_DIR="${REMOTE_DIR:-igsn}"
STACK_DIR="infra/$ENVIRONMENT"
COMPOSE="cd '$REMOTE_DIR' && docker compose -p igsn --env-file docker-compose.env"

ssh_deploy() { ssh -F "$SSH_CONFIG" deploy "$@"; }

node infra/scripts/compose-env.ts check --env "$ENVIRONMENT"

WORK_DIR="$(mktemp -d)"
cleanup() {
	rm -rf "$WORK_DIR"
	if [ -n "${LOGGED_IN:-}" ]; then
		ssh_deploy "docker logout ghcr.io" >/dev/null || true
	fi
}
trap cleanup EXIT

umask 077
node infra/scripts/compose-env.ts write --env "$ENVIRONMENT" > "$WORK_DIR/docker-compose.env"

ssh_deploy "mkdir -p '$REMOTE_DIR'"
ssh_deploy "test -f '$REMOTE_DIR/certs/origin.pem' && test -f '$REMOTE_DIR/certs/origin.key'" \
	|| { echo "missing TLS cert and key under ~/$REMOTE_DIR/certs" >&2; exit 1; }

scp -F "$SSH_CONFIG" \
	"$STACK_DIR/docker-compose.yml" "$STACK_DIR/Caddyfile" "$WORK_DIR/docker-compose.env" \
	"deploy:$REMOTE_DIR/"
ssh_deploy "chmod 600 '$REMOTE_DIR/docker-compose.env'"

if [ -n "${REGISTRY_TOKEN:-}" ]; then
	printf '%s\n' "$REGISTRY_TOKEN" \
		| ssh_deploy "docker login ghcr.io -u '${REGISTRY_USER:?}' --password-stdin"
	LOGGED_IN=1
fi

ssh_deploy "$COMPOSE up -d --pull always --wait --wait-timeout 300 --remove-orphans \
	&& $COMPOSE exec -T caddy caddy reload --config /etc/caddy/Caddyfile --force"

if [ -n "${SMOKE_URL:-}" ]; then
	for path in / /api/ /admin/; do
		curl -fsS -o /dev/null --retry 5 --retry-delay 5 "$SMOKE_URL$path"
	done
fi
