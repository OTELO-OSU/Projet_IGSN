#!/usr/bin/env bash
set -euo pipefail

: "${SSH_HOST:?set SSH_HOST to the deploy target}"
: "${SSH_USER:?set SSH_USER to the deploy user}"
: "${SSH_PRIVATE_KEY:?set SSH_PRIVATE_KEY to a key authorized on the deploy target}"
: "${SSH_KNOWN_HOSTS:?set SSH_KNOWN_HOSTS to the host public key}"

SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/igsn-deploy.config}"
KEY_FILE="${SSH_CONFIG%.config}.key"
KNOWN_HOSTS_FILE="${SSH_CONFIG%.config}.known_hosts"

install -d -m 700 "$(dirname "$SSH_CONFIG")"
umask 077

printf '%s\n' "$SSH_PRIVATE_KEY" > "$KEY_FILE"
printf '%s\n' "$SSH_KNOWN_HOSTS" > "$KNOWN_HOSTS_FILE"

printf 'Host deploy\n  HostName %s\n  Port %s\n  User %s\n  IdentityFile %s\n  IdentitiesOnly yes\n  UserKnownHostsFile %s\n' \
	"$SSH_HOST" "${SSH_PORT:-22}" "$SSH_USER" "$KEY_FILE" "$KNOWN_HOSTS_FILE" > "$SSH_CONFIG"
