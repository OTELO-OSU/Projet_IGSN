#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if [ -n "${CI_COMMIT_TAG:-}" ]; then
	latest="$(git tag -l 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1)"
	if [ "$CI_COMMIT_TAG" != "$latest" ]; then
		echo "deployment skipped: $CI_COMMIT_TAG is not the latest release, $latest is"
		exit 0
	fi
fi

node infra/scripts/compose-env.ts check

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

status="$(node infra/scripts/compose-env.ts payload | curl -sS -o "$body" -w '%{http_code} %{redirect_url}' --max-time 600 \
	-X PUT \
	-H "X-API-Key: $PORTAINER_API_KEY" \
	-H "Content-Type: application/json" \
	--data-binary @- \
	"${PORTAINER_URL%/}/api/stacks/$PORTAINER_STACK_ID?endpointId=$PORTAINER_ENDPOINT_ID")"

if [ "${status:0:1}" != "2" ]; then
	echo "Portainer answered $status:" >&2
	cat "$body" >&2
	exit 1
fi
echo "stack $PORTAINER_STACK_ID updated to $IMAGE_TAG"

for path in / /api/ /admin/; do
	curl -fsS -o /dev/null --max-time 10 --retry 18 --retry-delay 10 --retry-all-errors "https://igsn.$DOMAIN$path"
done
