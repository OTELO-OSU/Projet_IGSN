---
paths:
  - "**/*.tsx"
---

# Frontend testing

## Query components by accessible role

Component tests run in Vitest browser mode; build locators from `page` the way a user or assistive tech finds elements, in this order:

1. `page.getByRole(role, { name })` with the accessible name
2. `page.getByLabelText(text)` for form fields
3. `page.getByPlaceholder(text)`, `page.getByText(text)`
4. `page.getByTestId(id)`, last resort only

- A test that can only find an element by test id is testing a component the user cannot perceive: fix the markup, not the query.
- Locators are lazy and auto-retrying, so assert through `expect.element` with no `findBy`/`getBy` split and no manual waiting.
- Browser mode runs chromium only, with no `retry` mask: headless Firefox drops trusted input events under parallel load, and a retry reports a failing run as passing.
- Cover a Firefox-specific bug with a Playwright e2e journey, never by reinstating the browser matrix.

```tsx
test("should submit the declaration", async () => {
  render(<DeclarationForm />);
  await page.getByLabelText(/sample name/i).fill("Basalt 42");
  await page.getByRole("button", { name: /declare/i }).click();
  await expect.element(page.getByRole("alert")).toHaveTextContent(/saved/i);
});
```

## Mock the network with MSW, not the hooks

- Run component tests against a real `QueryClient` (`retry: false`) and fake the API at the network level with the shared MSW worker (`admin/test/msw.ts`).
- Never mock react-query hooks or spy on `window.fetch`: the cache, refetch and Zod-parse behavior is part of what the test covers.
- Each test registers the routes it needs with `worker.use(http.get(...))`, and handlers are never reset.
- An unhandled request logs an MSW warning: add the missing route, do not silence it.
