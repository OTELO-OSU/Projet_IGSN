#!/usr/bin/env bash
set -euo pipefail

MISSING_EXIT_CODE=3

latest="$(gh release view --json tagName --jq .tagName)"
if [ "$latest" != "$IMAGE_TAG" ]; then
	echo "::warning::deployment skipped: $IMAGE_TAG is not the latest release, $latest is"
	exit 0
fi

status=0
missing="$(node infra/scripts/compose-env.ts check --env prod 2>&1)" || status=$?
case "$status" in
	0) ;;
	"$MISSING_EXIT_CODE")
		echo "$missing" >> "$GITHUB_STEP_SUMMARY"
		echo "::warning::deployment skipped, images published: $missing"
		exit 0
		;;
	*)
		echo "$missing" >&2
		exit "$status"
		;;
esac

infra/scripts/setup-ssh.sh
infra/scripts/deploy-compose.sh prod
