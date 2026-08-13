---
name: cleanup-comments
description: Use when asked to clean up, strip, prune, or review comments on a branch, or when a diff carries narration comments, restated-code comments, changelog comments ("was X, now Y"), commented-out code, or stale TODOs. Deletes every comment but a business rule, a `ponytail:` marker, a temporary TODO and a tool directive, across every file the branch touches, not only the added lines.
---

# Cleanup comments

The target is zero comments. Only a business rule, a `ponytail:` marker or a temporary note survives.

Scope: every comment in every file the branch touches, pre-existing included.
Not the whole repo.

## Workflow

1. List the files: `git diff --name-only --diff-filter=d origin/main...HEAD`
   (`git fetch origin main` first if stale).
2. Read each file whole, not the diff: a comment's value depends on the code
   around it. Verdict every comment, including untouched ones.
3. Verdict (below), then edit. Comments only, never the code.
4. Run the gate (below) and report.

## Verdict

Does this state a business rule the code cannot? "No" deletes it.

**The unit is the sentence, not the block.** Prose blocks rarely pass whole: one
sentence carries the rule, the rest frame it or restate the code below. Verdict
each sentence, delete the failures even when a neighbour survives. Keeping one
sentence out of four is the normal outcome, not a compromise.

**Keep only these four:**

| Keep                                                           | Example                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Business rule, from the domain or a spec, absent from the code | `// IGSN spec caps the suffix at 9 chars`                                        |
| `ponytail:` marker (tracked debt, see ponytail:ponytail-debt)  | `// ponytail: naive O(n) scan, index it if the list grows`                       |
| TODO or out-of-scope note, temporary by construction           | `// TODO(#87): drop once the ROR sync ships`                                     |
| Tool directive, removing it changes behavior                   | `biome-ignore`, `oxlint-disable`, `@ts-expect-error`, `eslint-disable-next-line` |

A business rule is a fact about samples, IGSNs, publication or users, never a
fact about the code, a library, the framework or the browser.

A temporary note names the work that deletes it, so it leaves with that work and
never settles in as documentation.

**Delete, no discussion:**

- Anything not in that table, whatever it explains.
- Non-obvious why, library quirk, counter-intuitive workaround, cause of a hack: code facts, not business rules.
- Warning against a future mistake, keep-in-sync note, justification for a cast, a `!` or a missing dep array: a test guards those, never a comment.
- Public API doc, JSDoc, output-format example on an exported function.
- TODO/FIXME naming no work to delete it, or whose work has landed.
- Restates the code: `// increment the counter`, `// import React`
- Section banner: `// ---- helpers ----`, `// Types`, except `// Arrange` / `// Act` / `// Assert` in a test file, which the house style keeps
- Narrates the change or session: `// added filter`, `// was useMemo, now derived`
- Commented-out code, including "kept just in case"
- Test comments repeating the test name (`// it should return null`)
- Obvious-schema comments: `// zod schema for a sample`
- `any` explanations that excuse rather than inform
- Duplicate: the rule already lives on the type, the callee, or another file.
  Keep it where it is enforced, delete the copy.
- Over budget: more than two lines survived, so framing is still in there.

Doubt deletes. A comment survives by naming its row above, never by being
plausibly useful, and never because deleting it loses something.

Never author new comment text: no new claims, no rephrasing what you keep.
Dropping sentences and re-wrapping the survivors is deletion, and expected. The
surviving words must be the original words.

## Verification gate

```sh
pnpm fmt:apply
pnpm lint:check
git diff -U0 | grep -E '^[+-][^+-]' | grep -vE '^[+-]\s*(//|\*|/\*|\{/\*)'   # must be empty
```

The last one guards the comment-only invariant on THIS pass's delta; a hit means
you edited code, so revert it. Do not use `origin/main...HEAD` there: it shows
what the branch did and hides your delta once committed.

Never run the test suites: a comment cannot change behavior, so the run costs
minutes and proves nothing. Lint is the only behavior guard needed, it catches a
deleted tool directive. The comment-only delta above proves the rest.

Done when lint is clean and the delta is comments only.

## Report

One line per deletion, grouped by file, plus the keeps and their row:

```text
packages/domain/sample/model.ts
  - 12  "// zod schema for a sample"          restates code
  - 40  "// TODO fix later"                   names no work to delete it
  = 58 "// IGSN spec caps the suffix at 9"    business rule
```

## Red flags

- "I'll reword it instead of deleting it" -> delete it
- "It documents the obvious, but harmlessly" -> harm is upkeep, delete it
- "It explains what the next line does" -> the next line does that
- "The block carries a rule, so it stays whole" -> verdict each sentence
- "Trimming a paragraph is rewriting" -> only new words are authoring
- "It is pre-existing, someone chose it" -> its row is its only standing, not its age
- "A thin report is honest here" -> almost no deletions means you verdicted blocks, not sentences
- "Better to leave it than lose context" -> doubt deletes
- "It explains a library quirk no reader could guess" -> not a business rule, delete it
- "Without it someone will break this in a refactor" -> a test catches that, delete it
- "The rest of the branch already passed a cleanup" -> re-verdict it against this table
- "This explanation is really a TODO" -> a note nobody will ever delete is documentation, delete it now
- "The diff only added this one, the rest is out of scope" -> every comment in every touched file
- "Deleting a `biome-ignore` cleans up the file" -> directive, keep it
- "Tests still pass, so the code edit is fine" -> this pass edits comments only
- "I'll run the suite to be safe" -> comments cannot break it, lint is the guard
