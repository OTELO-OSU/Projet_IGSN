#!/usr/bin/env bash
# PostToolUse:ExitPlanMode -> create the session worktree + tasks dir, then
# trigger the IGSN feature team. All git chatter goes to stderr so stdout is
# only the hook JSON.
set -euo pipefail
input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id')
cwd=$(printf '%s' "$input" | jq -r '.cwd')
[ -n "$sid" ] && [ "$sid" != "null" ] || exit 0

dir="/tmp/_agents/$sid"
src="$dir/_source"
tasks="$dir/tasks"

mkdir -p "$tasks"
if [ ! -e "$src" ]; then
  # Record the source branch now: cwd is the shared main tree, so its current
  # branch is unreliable at cleanup (parallel sessions move it).
  git -C "$cwd" branch --show-current > "$dir/_source_branch" 2>/dev/null || true
  # -b creates wip/$sid; if that branch already exists (dir was removed but the
  # branch lingered), fall back to checking it out into the fresh worktree.
  git -C "$cwd" worktree add "$src" -b "wip/$sid" >/dev/null 2>&1 \
    || git -C "$cwd" worktree add "$src" "wip/$sid" >/dev/null 2>&1 || true
  # Fresh worktree has no node_modules (gitignored, not shared): install deps.
  [ -e "$src" ] && (cd "$src" && pnpm install) >&2 || true
fi

msg="A plan was just approved (plan mode exited). FIRST, before any other pipeline step, dispatch the read-only business-analyst subagent with this approved plan as its card. If its '## Open questions' list is non-empty, relay each to the user with AskUserQuestion and feed the answers back before continuing. Its ticket type, subtasks, and acceptance tests are the backbone of the task specs. THEN: the session worktree is ready at $src on branch wip/$sid (create it there if missing); rename that branch to <type>/<slug> using the BA ticket type and the plan slug. Write one spec file per task to $tasks/TASK-XXX.md (each carrying the BA acceptance tests it must satisfy) and register each on the shared task list. Then run the IGSN feature team in .claude/feature-team.md as team lead: spawn the developer teammate (sequential dev tasks) and reviewer teammates (parallel reviews), then doc-specialist and the commit gate. One ticket at a time. Do not create or remove the worktree yourself; the hooks own its lifecycle."

jq -n --arg ctx "$msg" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
