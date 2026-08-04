---
paths:
  - "**/*.tsx"
---

# Frontend testing

Testing conventions for components.

## Query components by accessible role

Component tests run in Vitest browser mode. Build locators from the `page`
object and select elements the way a user (or assistive tech) finds them, in
this order. A test that can only find an element by test id is testing a
component the user cannot perceive: fix the markup, not the query.

1. `page.getByRole(role, { name })` with the accessible name
   (`page.getByRole('button', { name: 'Save' })`)
2. `page.getByLabelText(text)` for form fields
3. `page.getByPlaceholder(text)`, `page.getByText(text)`
4. `page.getByTestId(id)` only as a last resort, when nothing above applies

Locators are lazy and auto-retrying: there is no `findBy`/`getBy` split. Assert
through `expect.element`, which retries until the condition holds, so no manual
waiting. This doubles as an accessibility check: if no role or label resolves,
the markup is inaccessible.

    import { expect, test } from 'vitest'
    import { page } from 'vitest/browser'

    test('should submit the declaration', async () => {
      render(<DeclarationForm />)
      await page.getByLabelText(/sample name/i).fill('Basalt 42')
      await page.getByRole('button', { name: /declare/i }).click()
      await expect.element(page.getByRole('alert')).toHaveTextContent(/saved/i)
    })

## Mock the network with MSW, not the hooks

Component tests run against a real `QueryClient` (`retry: false`) and fake the
API at the network level with the shared MSW worker (`admin/test/msw.ts`).
Never mock react-query hooks or spy on `window.fetch`: the cache, refetch, and
Zod-parse behavior is part of what the test covers.

Each test registers the routes it needs with `worker.use(http.get(...))`;
handlers are never reset (see `test/msw.ts`). An unhandled request logs an MSW
warning in the test output: add the missing route in the spec, do not silence
the warning.
