---
paths:
  - "e2e/**"
  - "**/*.e2e.ts"
---

# E2E testing (Playwright)

- One journey per business case, never per variation: these are the slowest tests in the repo. Variations belong in unit tests.
- Business cases only, framed as user journeys. No implementation-detail tests.
- Page objects per screen, in a `support/` directory, not beside the tests. Tests call their methods, never raw selectors inline.
- Locate by role and accessible name, the way a user or assistive tech would, never by CSS or test id.
- Never `waitForTimeout`. Deterministic waits only: `waitForResponse`, `waitForSelector`, `expect(locator).toBeVisible()`, `waitForLoadState('networkidle')`.
- Quarantine a flaky test with `test.fixme()` and a tracking reference before merge.
