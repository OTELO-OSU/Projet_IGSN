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
