#!/usr/bin/env bash
# SessionEnd -> merge the session branch back into the source branch, then
# remove the session worktree and its /tmp dir. On merge conflict, abort the
# merge and leave the worktree + branch in place so the user can resolve it.
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

  # Merge in whichever tree holds the source branch: cwd if it's still on it
  # (the idle main tree), otherwise check it out in this doomed worktree.
  tree=""
  if [ -z "$srcbranch" ]; then
    tree="" # no recorded source branch: nothing safe to merge into
  elif [ "$(git -C "$cwd" branch --show-current)" = "$srcbranch" ]; then
    tree="$cwd"
  elif [ -n "$srcbranch" ] && git -C "$src" checkout "$srcbranch" >/dev/null 2>&1; then
    tree="$src"
  fi

  if [ -n "$tree" ] && [ -n "$wip" ] && git -C "$tree" merge --no-edit "$wip" >/dev/null 2>&1; then
    git -C "$cwd" worktree remove --force "$src" >/dev/null 2>&1 || true
    git -C "$cwd" worktree prune >/dev/null 2>&1 || true
    rm -rf "$dir"
  else
    # No source branch, conflict, or nothing to merge: abort and keep the
    # worktree + branch so the user can resolve it by hand.
    [ -n "$tree" ] && git -C "$tree" merge --abort >/dev/null 2>&1 || true
  fi
else
  git -C "$cwd" worktree prune >/dev/null 2>&1 || true
  rm -rf "$dir"
fi
