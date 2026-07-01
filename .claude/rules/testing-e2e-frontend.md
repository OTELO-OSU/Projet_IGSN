---
paths:
  - "**/e2e/**"
  - "**/*.e2e.ts"
  - "**/*.spec.ts"
---

# E2E testing (Playwright)

Conventions for end-to-end flows.

- Use page objects. Encapsulate selectors and actions in a page object per
  screen; tests call its methods, never raw selectors inline. Page objects live
  in a `support/` directory, not alongside the tests.
- Test business cases only, framed as user journeys. No technical or
  implementation-detail tests.
- Focus on user experience and accessibility: locate elements by role and
  accessible name the way a user or assistive tech would, not by CSS or test id.

  import { test, expect } from '@playwright/test'

  test('ticket list loads', async ({ page }) => {
  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
  })

Never use timeout-based assertions (`waitForTimeout`). Prefer deterministic
waits: `waitForResponse`, `waitForSelector`, `expect(locator).toBeVisible()`,
and `waitForLoadState('networkidle')` to confirm a page has finished loading.
Quarantine flaky tests with `test.fixme()` and a tracking reference before merge.
