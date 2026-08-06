---
name: cleanup-comments
description: Use when asked to clean up, strip, prune, or review comments on a branch, or when a diff carries narration comments, restated-code comments, changelog comments ("was X, now Y"), commented-out code, or stale TODOs. Covers every file the branch touches, not only the added lines.
---

# Cleanup comments

Every comment is guilty until proven valuable. Name the proof or delete it.

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

What does a reader lose if this is gone? "Nothing" deletes it. "A fact not in
the code" keeps it.

**The unit is the sentence, not the block.** Prose blocks rarely pass whole: one
sentence carries the proof, the rest frame it or restate the code below. Verdict
each sentence, delete the failures even when a neighbour survives. Keeping one
sentence out of four is the normal outcome, not a compromise.

**Keep only with a named proof:**

| Proof                                                         | Example                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tool directive, removing it changes behavior                  | `biome-ignore`, `oxlint-disable`, `@ts-expect-error`, `eslint-disable-next-line` |
| `ponytail:` marker (tracked debt, see ponytail:ponytail-debt) | `// ponytail: naive O(n) scan, index it if the list grows`                       |
| Non-obvious WHY, unreachable from the code                    | `// Node ESM needs the explicit .ts here, api resolves this under nodenext`      |
| External constraint or spec citation                          | `// IGSN spec caps the suffix at 9 chars`                                        |
| Counter-intuitive workaround with its cause                   | `// Kysely drops the cast, hence the raw sql`                                    |
| Warning that prevents a real mistake                          | `// keep in sync with publishBlockerSchema, the label map is exhaustive`         |
| TODO with a ticket or issue reference                         | `// TODO(#87): drop once the ROR sync ships`                                     |
| Legally required header                                       | licence block                                                                    |
| Public API doc a consumer reads                               | exported domain helper JSDoc that says something the signature does not          |

**Delete, no discussion:**

- Restates the code: `// increment the counter`, `// import React`
- Section banner: `// ---- helpers ----`, `// Types`, except `// Arrange` / `// Act` / `// Assert` in a test file, which the house style keeps
- Narrates the change or session: `// added filter`, `// was useMemo, now derived`
- Commented-out code, including "kept just in case"
- TODO/FIXME with no ticket and no context
- JSDoc that only re-types the signature (`@param id the id`)
- Test comments repeating the test name (`// it should return null`)
- Obvious-schema comments: `// zod schema for a sample`
- `any` explanations that excuse rather than inform
- Duplicate: the fact already lives on the type, the callee, or another file.
  Keep it where it is enforced, delete the copy.
- Over budget: more than two lines survived, so framing is still in there.

Ambiguity resolves to deletion. "Might help someone later" is not a proof.

Never author new comment text: no new claims, no rephrasing what you keep.
Dropping sentences and re-wrapping the survivors is deletion, and expected. The
surviving words must be the original words.

The `flag-added-comments` hook rejects any Edit whose replacement holds a comment
line, so a sentence trim needs a script (`python3` string replace); whole-line
deletions go through Edit.

## Verification gate

```sh
pnpm fmt:apply
pnpm lint:check
git diff -U0 | grep -E '^[+-][^+-]' | grep -vE '^[+-]\s*(//|\*|/\*)'   # must be empty
```

The last one guards the comment-only invariant on THIS pass's delta; a hit means
you edited code, so revert it. Do not use `origin/main...HEAD` there: it shows
what the branch did and hides your delta once committed.

Never run the test suites: a comment cannot change behavior, so the run costs
minutes and proves nothing. Lint is the only behavior guard needed, it catches a
deleted tool directive. The comment-only delta above proves the rest.

Done when lint is clean and the delta is comments only.

## Report

One line per deletion, grouped by file, plus the keeps and their proof:

```text
packages/domain/sample/model.ts
  - 12  "// zod schema for a sample"          restates code
  - 40  "// TODO fix later"                   no ticket, no context
  = 58 "// IGSN spec caps the suffix at 9"    spec citation
```

## Red flags

- "I'll reword it instead of deleting it" -> delete it
- "It documents the obvious, but harmlessly" -> harm is upkeep, delete it
- "It explains what the next line does" -> the next line does that
- "The block carries a proof, so it stays whole" -> verdict each sentence
- "Trimming a paragraph is rewriting" -> only new words are authoring
- "It is pre-existing, someone chose it" -> the proof is its only standing, not its age
- "A thin report is honest here" -> almost no deletions means you verdicted blocks, not sentences
- "Better to leave it than lose context" -> ambiguity resolves to deletion
- "The diff only added this one, the rest is out of scope" -> every comment in every touched file
- "Deleting a `biome-ignore` cleans up the file" -> directive, keep it
- "Tests still pass, so the code edit is fine" -> this pass edits comments only
- "I'll run the suite to be safe" -> comments cannot break it, lint is the guard
