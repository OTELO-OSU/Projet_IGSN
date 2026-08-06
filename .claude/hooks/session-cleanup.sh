#!/usr/bin/env bash
# SessionEnd -> merge the session branch back into the source branch, then
# remove the session worktree and its /tmp dir.
set -euo pipefail
input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id')
cwd=$(printf '%s' "$input" | jq -r '.cwd')
# Guard: never let an empty/null session id turn this into rm -rf /tmp.
[ -n "$sid" ] && [ "$sid" != "null" ] || exit 0

dir="/tmp/_agents/$sid"
src="$dir/_source"

if [ -e "$src" ]; then
  wip=$(git -C "$src" branch --show-current)
  srcbranch=""
  [ -f "$dir/_source_branch" ] && srcbranch=$(cat "$dir/_source_branch")

  tree=""
  if [ -z "$srcbranch" ]; then
    tree=""
  elif [ "$(git -C "$cwd" branch --show-current)" = "$srcbranch" ]; then
    tree="$cwd"
  elif [ -n "$srcbranch" ] && git -C "$src" checkout "$srcbranch" >/dev/null 2>&1; then
    tree="$src"
  fi

  if [ -n "$tree" ] && [ -n "$wip" ] && git -C "$tree" merge --no-edit "$wip" >/dev/null 2>&1; then
    git -C "$cwd" worktree remove --force "$src" >/dev/null 2>&1 || true
    rm -rf "$dir"
  else
    # No source branch, conflict, or nothing to merge: abort and keep the
    # worktree + branch so the user can resolve it by hand.
    [ -n "$tree" ] && git -C "$tree" merge --abort >/dev/null 2>&1 || true
  fi
else
  # Drop only this session's admin entry. A blanket `git worktree prune` would
  # also drop live sessions': parallel devcontainers share this .git but each has
  # its own /tmp volume, so their worktree paths look missing from here.
  # --path-format=absolute: from the main tree this prints a bare ".git", which
  # would resolve against the hook's cwd instead of the repo.
  common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir)
  grep -lx "$src/.git" "$common/worktrees"/*/gitdir 2>/dev/null \
    | xargs -r dirname | xargs -r rm -rf
  rm -rf "$dir"
fi
