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
    tree="" # no recorded source branch: nothing safe to merge into
  elif [ "$srcbranch" = "main" ] || [ "$srcbranch" = "master" ]; then
    tree="" # feature-team.md: never merge into main, surface it instead
  elif [ "$(git -C "$cwd" branch --show-current)" = "$srcbranch" ]; then
    tree="$cwd"
  elif [ -n "$srcbranch" ] && git -C "$src" checkout "$srcbranch" >/dev/null 2>&1; then
    tree="$src"
  fi

  # --ff-only, per the standing rule: a fast-forward is the only branch movement
  # allowed here. A divergence is the human's to rebase.
  if [ -n "$tree" ] && [ -n "$wip" ] && git -C "$tree" merge --ff-only "$wip" >/dev/null 2>&1; then
    git -C "$cwd" worktree remove --force "$src" >/dev/null 2>&1 || true
    git -C "$cwd" worktree prune >/dev/null 2>&1 || true
    rm -rf "$dir"
  else
    # No source branch, source is main, diverged, or nothing to merge: keep the
    # worktree + branch so the user can resolve it by hand.
    [ -n "$tree" ] && git -C "$tree" merge --abort >/dev/null 2>&1 || true
  fi
else
  git -C "$cwd" worktree prune >/dev/null 2>&1 || true
  rm -rf "$dir"
fi
