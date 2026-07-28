---
name: cleanup-comments
description: Use when asked to clean up, strip, prune, or review comments on a branch, or when a diff carries narration comments, restated-code comments, changelog comments ("was X, now Y"), commented-out code, or stale TODOs. Covers every file the branch touches, not only the added lines.
---

# Cleanup comments

Every comment is guilty until proven valuable. A comment earns its place only by
passing one of the proofs below. If you cannot name the proof, delete it.

Scope: every comment in every file the branch touches, pre-existing ones
included. Not the whole repo.

## Workflow

### 1. List the files

```sh
git diff --name-only --diff-filter=d origin/main...HEAD
```

Fetch first if `origin/main` is stale (`git fetch origin main`).

### 2. Read each file whole

Read the full file, not the diff. A comment's value depends on the code around
it, and the diff hides that. Verdict every comment in the file, including ones
the branch did not touch.

### 3. Apply the test to each comment

Ask: what does a reader lose if this comment is gone? If the answer is
"nothing", delete it. If it is "a fact not in the code", keep it.

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
- Section banner: `// ---- helpers ----`, `// Types`
- Narrates the change or the session: `// added filter`, `// was useMemo, now derived`, `// as requested`
- Commented-out code, including "kept just in case"
- Dead or unowned TODO/FIXME with no ticket and no context
- JSDoc that only re-types the signature (`@param id the id`)
- Test comments that repeat the test name (`// it should return null`)
- Obvious-schema comments: `// zod schema for a sample`
- `any` explanations that excuse rather than inform

Ambiguity resolves to deletion. "Might help someone later" is not a proof.

### 4. Delete

Edit the files. Delete the whole comment and its blank line if it leaves one.
Never rewrite a comment to make it defensible, that is authoring new comments,
not cleaning up. Never touch the code itself: this pass changes comments only.

### 5. Verification gate

Run, in order, and paste the outcome:

```sh
pnpm fmt:apply
pnpm lint:check
pnpm test --project @projet-igsn/<project>   # each project whose files changed
```

Then confirm the code-only invariant:

```sh
git diff -U0 origin/main...HEAD -- <touched files>
```

Every line this pass added or removed must be a comment line or a blank line.
A non-comment line in your own delta means you edited code: revert it.

Done when lint is clean, the touched projects' tests pass, and the delta is
comments only. If a suite was already failing on `origin/main`, say so instead
of claiming a pass.

## Report

One line per deletion, grouped by file, plus the kept comments and their proof:

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
- "The diff only added this one, so the rest is out of scope" -> scope is every comment in every touched file
- "Deleting a `biome-ignore` cleans up the file" -> that is a directive, keep it
- "Tests still pass, so the code edit is fine" -> this pass edits comments only
