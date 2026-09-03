---
type: practice
title: Testing strategy
description: >-
  One test per domain rule, endpoints driven through the Hono app against a real
  Postgres, components in Vitest browser mode by accessible role with MSW.
resource: .claude/rules/testing.md
tags:
  - testing
  - practice
relations:
  - type: depends_on
    target: kysely-dbal
  - type: depends_on
    target: dev-practices
status: stable
---

Red, green, refactor; Arrange-Act-Assert, one behaviour per test. Untested behaviour does not ship, but coverage is a floor on the rules, not a licence to enumerate.

**What and how many.** The unit is the behaviour, not the function, so a private helper is covered through its caller. Cases come from the spec (the ticket's acceptance tests, the domain rules, `CLAUDE.md`), never from reading the implementation, which freezes its bugs as rules. One test per domain rule, not per input, branch, line or function; one happy path; only the failures the spec names; cases differing only by input collapse into one `it.each`; one whole-value `toEqual` over several partial assertions. Name the rule a test guards before writing it, and if you cannot, do not write it. A spec file much longer than its module is enumeration.

**Never test** what the compiler proves (types, exhaustive switches, required props), third-party behaviour (Zod rejecting a wrong type, Kysely building SQL), constants, re-exports, label maps, schema-declared mappings, or a helper a caller covers. Never test an invariant-guaranteed impossible state: a loud parse failure is the correct behaviour there. The one exception is the tree-vocabulary label-coverage spec, a build gate on a runtime path ([[i18n-strategy]]).

**Backend** (`packages/api`): drive endpoints with Hono's `testClient(app)` so routing, validation and middleware run as in production, asserting status AND body. Per endpoint, the happy path plus only the failures it enforces (400, 401, 403, 404), which stay even under the per-rule budget, being the trust boundary. Integration tests against real Postgres through `@kysely-vitest/postgres`, never a mocked query builder or fake repository, each test owning the data it creates and relying on the per-test transaction rollback ([[kysely-dbal]]).

**Frontend components**: Vitest browser mode, chromium only, no retry mask. Query by accessible role first (`page.getByRole(role, { name })`), then label text, then placeholder or text, with test ids a last resort; a test that can only find an element by test id is testing something the user cannot perceive, so fix the markup. Locators are lazy and auto-retrying, so assert through `expect.element` with no manual waiting. Fake the API at the network level with the shared MSW worker against a real `QueryClient` (`retry: false`), never mocking react-query hooks or spying on `window.fetch`; an unhandled request's warning means a missing route, not something to silence. Specs run unstyled, no app CSS being loaded, so an off-viewport click timeout wants `page.viewport`, not an app change.

**E2E** (Playwright, `e2e/`): one journey per business case, framed as a user journey, variations belonging in unit tests. Page objects per screen in `support/`, located by role and accessible name. Never `waitForTimeout`, only deterministic waits. Quarantine a flake with `test.fixme()` and a tracking reference before merge. `make test-e2e` stands up a throwaway prod stack and tears it down after; run it once per change when app code changed, and report the verdict. The frontend suite is iPhone-12-emulated. Playwright matches an accessible name by substring, so a page object picking a field whose label prefixes another one (`Starting material` inside `Nature of starting material`) anchors the name with a `^` regex.

Only update a test to make it pass if the domain rule changed; otherwise it caught a regression. Test content is in English. Pruning duplicate coverage is a separate pass (`cleanup-tests` skill).
