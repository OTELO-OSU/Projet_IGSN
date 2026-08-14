#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id')
cwd=$(printf '%s' "$input" | jq -r '.cwd')
[ -n "$sid" ] && [ "$sid" != "null" ] || exit 0

dir="/tmp/_agents/$sid"
tasks="$dir/tasks"

mkdir -p "$tasks"
[ -f "$dir/_base" ] || git -C "$cwd" rev-parse HEAD > "$dir/_base" 2>/dev/null || true
base=$([ -f "$dir/_base" ] && cat "$dir/_base" || echo HEAD)

msg="A plan was just approved (plan mode exited). Start at step 0 of .claude/feature-team.md, the size gate: it decides the whole chain, so spawn no agent before it. The business-analyst already ran during planning and its output is in the plan. Work in place in $cwd on the current branch, cutting a branch only if that is main or master, per step 1. \$BASE is $base, the commit reviewers diff against. Task specs go in $tasks/TASK-XXX.md, one per task, each carrying the acceptance tests it must satisfy. Then work the pipeline in order as team lead. One ticket at a time."

jq -n --arg ctx "$msg" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
