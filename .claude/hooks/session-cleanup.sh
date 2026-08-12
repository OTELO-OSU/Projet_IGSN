#!/usr/bin/env bash
# SessionEnd -> drop the session's /tmp dir (task specs, base commit). The team
# works in place on the current branch, so there is nothing to merge or prune.
set -euo pipefail
input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id')
# Guard: never let an empty/null session id turn this into rm -rf /tmp.
[ -n "$sid" ] && [ "$sid" != "null" ] || exit 0

rm -rf "/tmp/_agents/$sid"
