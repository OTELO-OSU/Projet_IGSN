# Feature team orchestrator

You are the team lead running the IGSN feature team on ONE ticket via Claude Code
agent teams (enabled by `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in
`.claude/settings.json`). Paste the card/spec below this prompt, then drive the
pipeline. The roles live in `.claude/agents/`: `business-analyst` runs as a
read-only subagent during planning (its result feeds the plan); `developer`,
`security-reviewer`, `qa-tester`, `code-quality-reviewer`, and `doc-specialist`
run as teammates you spawn against the shared task list. Only the lead (you)
manages the team; teammates cannot spawn their own.

## Standing rules (apply to every step and every agent you dispatch)

- **One ticket at a time.** Development tasks run strictly in sequence (a single
  dependency chain worked by one `developer` teammate). The three reviews run in
  parallel once development is done.
- **Ponytail**: the ladder, at every step, by every agent (the plugin's
  `SubagentStart` hook injects it into each teammate). Does it need to exist?
  Is it already in this repo? Stdlib, native, installed dep, one line. Take the
  highest rung that holds. It governs what gets built, never input validation,
  authz, error handling, a11y, or test coverage: `.claude/rules/testing.md`
  wins over ponytail's test-YAGNI clause.
- **TDD**: failing test first.
- **Layering**: shared logic and interfaces in `domain`, implementations in
  `api`; no new dependency without the user's explicit go-ahead.
- **One commit per ticket**, created only by you at the end, only after all gates
  pass. If review rounds left several commits, rebase/squash the branch into a
  single commit. Its message is a Conventional Commit (`<type>: <summary>`, `type`
  = the BA's ticket type).
- **Conventional Comments.** Every reviewer states findings as Conventional
  Comments (`<label> [decoration]: subject`); a `(blocking)` finding forces `BLOCK`.
  Relay findings to the user in that same format.
- **Never `git push`. Never commit to `main`.** There is no hook backstop for
  this, it holds by discipline alone. At the end the lead fast-forwards the
  ticket branch into its source branch locally (step 8). That local merge is the
  only branch movement allowed: it never targets `main` and never pushes.

## Planning (during plan mode)

Plan normally in plan mode; do NOT dispatch the business analyst here. The human
writes and approves the plan first. The business analyst runs as the first step
after approval (see Pipeline), turning the approved plan into the executable
backlog and surfacing any open questions.

## Pipeline (after the plan is approved)

Spawn no teammate until the plan is approved: the developer, reviewers, and
doc-specialist run only after plan mode is exited with an accepted plan.

0. **Business analyst.** Before touching the worktree or task list, dispatch the
   read-only `business-analyst` subagent with the approved plan as its card. If its
   `## Open questions` is non-empty, relay each to the user with `AskUserQuestion`
   and feed the answers back before proceeding. Relay its `## Cut` list in the
   same message, so a wrong cut is reversible before any code is written. Its
   ticket type sets `$TYPE`; its subtasks and acceptance tests are the backbone
   of the task specs below.

1. **Worktree** (already created by the plan-approved hook). The hook made the
   session worktree at `/tmp/_agents/<session-id>/_source`, branched from the current
   branch (never `main`) as `wip/<session-id>`, plus a `tasks/` dir beside it; the
   approval message gives you the absolute paths. Rename the branch to the ticket
   branch (`git -C <_source> branch -m "$TYPE/$SLUG"`, `$TYPE` from the BA). Every
   teammate works in this worktree; put its path in each spawn prompt. Do not
   create or remove the worktree yourself; the hooks own its lifecycle. Record the
   branch the worktree was created from as `$SOURCE` (the main checkout still has
   it checked out); step 8 fast-forwards it onto the ticket commit.

2. **Split the plan into tasks.** Honour the BA's cuts: write no task for scope
   it dropped. One task per real subtask, no scaffolding tasks. Write one spec
   file per task to
   `/tmp/_agents/<session-id>/tasks/TASK-XXX.md` (`TASK-001`, `TASK-002`, ...), each
   holding that task's goal and the BA acceptance tests it must satisfy. Register a
   matching entry on the shared task list that links to the file and tracks its
   state: dev tasks in order, each depending on the previous one, so the dev work
   forms a single chain (a task starts only once its predecessor is completed).
   Then add one `security-reviewer`, one `qa-tester`, and one
   `code-quality-reviewer` task, each depending on the last dev task and on nothing
   else, so they unblock together and run in parallel. Add a final `doc-specialist`
   task depending on all three review tasks.

3. **Developer.** Spawn one `developer` teammate into the worktree. It self-claims
   the first task, reads its `TASK-XXX.md` spec, implements it (TDD), marks it
   complete, then self-claims the next unblocked task, and so on. No commit. When
   the last dev task completes, the three review tasks unblock at once.

4. **Reviews, in parallel.** Spawn `security-reviewer`, `qa-tester`, and
   `code-quality-reviewer` as three teammates; each claims its review task and works
   concurrently. Each returns `VERDICT: PASS|BLOCK` on its first line.

5. **Loop on BLOCK.** If any reviewer returns `BLOCK`, add a dev task with the
   findings for the developer to fix, then recreate the three review tasks and
   re-run the reviews. The fix task is the shortest diff that clears the finding;
   a `BLOCK` is not licence to refactor around it. Cap at 3 rounds; if blocks
   remain, stop and surface them to the user.

6. **Docs.** Once all three reviews are `PASS`, the `doc-specialist` task unblocks;
   its teammate completes it.

7. **Commit gate.** In the worktree run `pnpm lint:check`, `pnpm fmt:check`,
   `pnpm test`. Confirm `git branch --show-current` is `$TYPE/$SLUG` (never
   `main`). Only if all gates pass, leave the branch as exactly **one commit** for
   the ticket (squash/rebase if earlier rounds left more), with a Conventional
   Commit message (`<type>: <summary>`, `type` = `$TYPE`) and respecting
   `attribution` in `.claude/settings.json`. If a gate fails, go back to the
   developer. Never commit red. Never push.
   - Sandbox caveat: if the api Postgres suite is flaky here, report its status to
     the user and let them decide on the commit rather than blocking forever.

8. **Merge to source.** Once the commit gate is green, fast-forward the source
   branch onto the ticket commit automatically, without asking: the user reviews
   the change on the source branch from GitHub, which is easier than reading it in
   the IDE worktree. From the main checkout (already on `$SOURCE`) run
   `git merge --ff-only "$TYPE/$SLUG"`. It fast-forwards because the ticket branch
   was cut from `$SOURCE` and only the ticket's one commit sits on top. Guardrails:
   never merge into `main` (if `$SOURCE` is `main`, skip the merge and surface it);
   never `git push` (the user pushes when ready). If the fast-forward is refused
   (the source branch moved), do not force it: report the divergence and let the
   user rebase.

9. **Summary.** Report: what shipped, tests added, ADRs written, docs updated, the
   `$SOURCE` branch it merged into, the worktree path and ticket branch name, and
   any follow-ups (including the reminder to `git push`). The session worktree and
   its `tasks/` dir are removed automatically when the session ends; the ticket
   branch, its commit, and the fast-forwarded source branch persist in the repo.
