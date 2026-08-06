---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Testing

## E2E before ending a session

- Changed app code (`admin`, `frontend`, `api`, or what they consume from `domain`/`design-system`)? Run `make test-e2e` and report the verdict.
- Skip only for changes with no runtime surface.

## What to test

- Every behavior a user or a cross-file caller depends on: untested behavior does not ship.
- The unit is the behavior, not the function, so a private helper is covered through its caller.
- Take cases from the spec (the ticket's acceptance tests, the domain rules, `CLAUDE.md`), never from reading the implementation, which freezes its bugs as rules.
- Assert behavior and outputs, never internals.
- Test domain rules only, not styling or attributes, unless a rule binds them.
- Cover the happy path and the errors the spec says it must reject.

## How many tests

Coverage is a floor on the rules, not a licence to enumerate.

- One test per domain rule, not per input, branch, line, or function.
- One happy path, unless the spec states a different rule for the second.
- Only the failures the spec names.
- Cases differing only by input or output collapse into one `it.each`.
- One whole-value `toEqual` over several partial tests.
- Name the rule a test guards, in one line, before writing it; if you cannot, don't write it.
- A spec file much longer than its module is enumeration, not coverage.

Never test what the compiler proves (types, exhaustive switches, required props), third-party behavior (Zod rejecting a wrong type, Kysely building SQL), constants, re-exports, label maps, schema-declared mappings, or a helper a caller covers.

The one exception is the tree-vocabulary label-coverage spec `i18n.md` mandates, a build gate on a runtime path no reviewer cuts.

BOUNDARY finds candidates (boundary and out-of-range values, unexpected input, null, duplicates, alternative states, races, failure conditions), but keep only those the spec rules on; an edge case the spec is silent on is a question for the ticket.

## How to write them

- Red, green, refactor.
- Arrange-Act-Assert, one behavior per test.
- Keep tests fast and repeatable whatever the date, network, or order.
- No shared mutable state (reset mocks in `beforeEach`).
- A failure names its own reason.
- Name the test after the behavior: `it("should return an empty array when no items match")`, never `it("should work")`.
- Assert whole values with `toEqual` (`toMatchObject` for a subset), since asserting one field lets the rest regress.
- Use `it.each` for cases varying only by input, with passing and failing cases in separate blocks.
- Only update a test to make it pass if the domain rule changed; otherwise it caught a regression, so fix the code.
- Pruning tests that duplicate existing coverage is a separate pass, see the `cleanup-tests` skill.
