---
name: cleanup-tests
description: Use when asked to clean up, trim, prune, or audit tests on a branch, or when a suite carries tests that duplicate existing coverage, assert nothing that can fail, mirror a data structure literally, or repeat each other instead of using it.each. Covers every test file the branch touches, diffed from main.
---

# Cleanup tests

Every test must be able to fail. Name the edit that breaks it, or delete it.

Scope: every Vitest spec file the branch touches, pre-existing tests included.
Not the whole repo, and not `e2e/` (Playwright journeys, no mutation gate,
ruled by `.claude/rules/testing-e2e-frontend.md`). Tests only:
never edit source, and never delete a red test, a failing test is a bug report.

## Workflow

1. List the files:
   `git diff --name-only --diff-filter=d origin/main...HEAD -- 'packages/**/*.spec.ts' 'packages/**/*.spec.tsx'`
   (`git fetch origin main` first if stale).
2. Baseline the package: `cd packages/<pkg> && pnpm exec vitest run`. Record the
   test and failure counts: the run must stay green, minus known flakes.

3. Read each spec whole, and the source it tests. A test's value is decided by
   the implementation, not by how it reads.
4. Verdict each test: delete, collapse, or merge.
5. Run the gate and report.

## Verdict

What source edit makes this test fail? Cannot name one, or another test already
covers it, delete it. Ambiguity resolves to deletion.

Delete:

| Pattern              | Symptom                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Tautology            | Asserts a schema against the const it is built from (`z.enum(X)` over `X`)                                     |
| Third-party behavior | Zod rejects a non-member, the framework routes, `JSON.parse` throws                                            |
| Thin wrapper         | The unit delegates (`materialSegment` -> `pathSegment`, `g(...).length === 0`) and the callee has its own spec |
| Data mirror          | Literal copy of a structure: child lists, key lists, `toHaveLength(240)`                                       |
| Composition-only     | `parse({ ...valid, sub: <valid sub> })` where `sub` owns a spec                                                |
| Restates a sibling   | Two tests, one assertion, different words                                                                      |

Keep: a conditional rule (a field required only when a sibling is set, `min <= max`),
a boundary, an error code a consumer keys off, a policy the data does not state,
a regression with a cause.

Keep unconditionally, they are the trust boundary, not duplicates
(`.claude/rules/testing-backend.md`): an `api` endpoint's 400 / 401 / 403 / 404
cases, even when the 400 looks like third-party Zod behavior and the 401 reads
like a sibling of the 403.

### Collapse a parametrised invariant

`it.each(BIG_LIST)` whose body asserts one rule per item is one test, not N. It
hides failures in a wall of identical green and renames hundreds of tests on
every legitimate data edit. Assert the counterexample list is empty, never a
count or a boolean: the failure must name the offender.

```ts
// 735 tests -> 1, same coverage
it("should include the parent of every dotted path", () => {
  const orphans = MATERIAL_PATHS.filter(
    (path) =>
      path.includes(".") &&
      !MATERIAL_PATHS.includes(path.split(".").slice(0, -1).join(".")),
  );
  expect(orphans).toEqual([]);
});
```

### Merge into it.each

Sibling tests that differ only by input are one `it.each`. Merge them, do not
delete coverage to avoid the merge.

```ts
// 5 tests -> 1
it.each(["7", "999", "abc", 0, -5])(
  "should fall back to the default for off-preset %s",
  (size) => {
    expect(pageSizeSchema(50).parse(size)).toBe(50);
  },
);
```

Per `.claude/rules/testing.md`:

- Accepted and rejected cases stay in separate blocks.
- Merge within one validation context only. Different rules stay different tests.
- Add a label column only when the value alone is opaque
  (`["a latitude out of range", "-10,200,10,50"]`), never to restate it.
- Over ~12 rows is a data mirror wearing an `it.each`: cut to representatives,
  or collapse per the section above.

## Verification gate

```sh
cd packages/<pkg>
pnpm exec vitest run                                          # green, count dropped
cd - && pnpm lint:check && pnpm fmt:check                     # unused imports left by deletions
git diff --name-only origin/main...HEAD | grep -v '\.spec\.'  # must be empty
```

**Then mutate.** For every test you collapsed or merged, break the source it
covers, confirm it goes red, revert:

```sh
cp src/<file>.ts /tmp/f.bak
python3 -c "p='src/<file>.ts'; s=open(p).read(); open(p,'w').write(s.replace('<rule>','<broken>'))"
pnpm exec vitest run src/<file>.spec.ts   # must FAIL on the collapsed test
cp /tmp/f.bak src/<file>.ts
```

Green proves nothing, and a collapsed test that cannot fail is worse than the N
it replaced. Done when the suite is green at a lower count, lint and fmt are
clean, the delta touches only spec files, and every collapsed test was shown to
fail.

## Report

Per file: what went, why, the count delta. Then the mutation evidence.

```text
domain/sample/material/classification.spec.ts   791 -> 59
  - it.each(MATERIAL_PATHS) accept       tautology, schema is refine(p => MATERIAL_PATHS.includes(p))
  - it.each(...) parent of %s   x735     parametrised invariant, collapsed to one orphan-list test
domain/sample/type/segment.spec.ts              deleted
  - 4 tests                              delegates to pathSegment, which has its own spec

mutation: emitted leaves only from expandPaths -> 4 collapsed parent tests red. reverted.
total: 1957 -> 750 tests, 0 failures
```

## Red flags

- "It feels like coverage, but I cannot name the breaking edit" -> delete it
- "It is red, so it is clutter" -> stop and read it, it is a bug report
- "735 named cases read better than one" -> they hide the failure, collapse them
- "Green after the trim, so it is safe" -> mutate
- "I will fix the source while I am here" -> spec files only this pass
