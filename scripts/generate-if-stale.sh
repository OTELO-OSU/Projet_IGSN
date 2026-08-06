#!/usr/bin/env bash
# Recompile the paraglide catalogs and the tanstack route trees, but only when
# their generated output is older than its sources: each pnpm invocation costs
# ~10s of boot here, and a typical commit touches neither.
#
# mtime, not `git diff --cached`: src/paraglide is gitignored, so git has no
# baseline for it, and a branch switch or a fresh clone leaves the output stale
# without showing anything in the diff. A stale catalog makes `oxlint --fix`
# type-check every m.* call against the wrong keys.
#
# Usage: ./scripts/generate-if-stale.sh   (pre-commit hook, `make generate`)
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." # repo root

stale() { target=$1; shift; [ ! -e "$target" ] || [ -n "$(find "$@" -newer "$target" -print -quit 2>/dev/null)" ]; }

if stale packages/admin/src/paraglide/messages.js \
    packages/domain/messages packages/admin/messages packages/*/project.inlang/settings.json \
  || stale packages/frontend/src/paraglide/messages.js \
    packages/domain/messages packages/frontend/messages packages/*/project.inlang/settings.json; then
  pnpm -r --parallel run compile-i18n
fi

# Route dirs only: tsr reads the route file set, not file bodies. It also leaves
# routeTree.gen.ts alone when that set is unchanged, so stamp it or the
# comparison never clears.
if stale packages/admin/src/routeTree.gen.ts packages/admin/src/routes -type d \
  || stale packages/frontend/src/routeTree.gen.ts packages/frontend/src/routes -type d; then
  pnpm -r --parallel run generate-routes
  touch packages/admin/src/routeTree.gen.ts packages/frontend/src/routeTree.gen.ts
fi
