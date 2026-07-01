---
name: add-admin-component
description: Use when adding a React component to packages/admin. Enforces TDD in Vitest browser mode, accessible-role queries, the React rules (React Compiler, no manual memoization), and validating forms against the @projet-igsn/domain Zod schemas.
---

# Add an admin component

The primary user is a change-averse researcher (CLAUDE.md), so accessibility
matters (accessibility rule). Components are tested in Vitest **browser mode** and
queried the way a user finds them.

Follow TDD (testing rule).

## Workflow

1. **Clarify behaviour.** If the component's behaviour is not obvious, use the
   `superpowers:brainstorming` skill first. Otherwise continue.

2. **Test first (browser mode).** Create `src/<area>/<Component>.spec.tsx`. Render
   with `vitest-browser-react` and query by accessible role/label (testing rule).
   Assert through `expect.element` / the returned screen (see `src/App.spec.tsx`).

   ```tsx
   import { render } from "vitest-browser-react";
   import { DeclarationForm } from "./DeclarationForm";

   it("should reject a blank sample name", async () => {
     const screen = await render(<DeclarationForm />);
     await screen.getByRole("button", { name: /declare/i }).click();
     await expect.element(screen.getByRole("alert")).toBeVisible();
   });
   ```

3. **Build the component (minimum to pass).** Follow the react and accessibility
   rules for hooks, effects, and markup. New libraries need sign-off (dependencies
   rule).

4. **Types and validation.** Import entity types and schemas from their
   `@projet-igsn/domain` subpath (e.g. `@projet-igsn/domain/igsn/model`) rather than
   re-declaring shapes. Validate form input and parse every API response with the
   domain Zod schema at the boundary (frontend-security rule).

5. **Refactor:** split presentational vs container as it grows (coding-style rule).

## Verification gate

- `pnpm test packages/admin` green (runs in headless Chromium).
- Every interactive element is reachable by role/label in the test (testing rule).
- Render it for real: `pnpm --filter @projet-igsn/admin dev` on
  http://localhost:3001 and check keyboard operability and visible focus.

Not done until the tests pass and you have seen the output.
