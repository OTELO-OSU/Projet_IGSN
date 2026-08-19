---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# Forms

- Build every form with `useAppForm` from `@projet-igsn/design-system/components/form/app-form`, never raw `@tanstack/react-form`.
- Pass per-form `defaultValues` and `validators` (a zod schema from `domain`).
- Reuse the existing bound inputs (`TextField`, `SubmitButton`...) via `form.AppField` / `form.AppForm`.
- Missing an input? Add it to `packages/design-system/src/components/form/` and register it in `app-form.tsx`, never inline a one-off input in an app.

## Required marker

- Required means required to publish, not to save a draft: a field whose absence blocks publication carries a trailing "\*" in its label, in text, never color alone.
- A conditional requirement adds the marker the moment it starts to hold and drops it when it stops (`withRequired`).

## Dependent fields

A field meaningless until a sibling is filled (a unit without its value):

- Hide it until the sibling is set.
- Mark it required once shown.
- Have the schema reject its value while the sibling is missing.
- Gate the render and the compose exclusion on one shared helper, never two expressions that happen to agree.

## Hidden values (ADR 0015)

Values hidden by UI state (a field for the other branch of a toggle, a tab hidden by another value):

- While editing, keep them in the form store, so switching back restores what the user entered.
- On save, exclude them in the compose step before validation, so a hidden value never raises a schema error the user cannot see or fix.
- After a successful save, reset the form to the draft rebuilt from the submitted value, so dropped leftovers do not look saved.
- Every rule that hides a field needs its matching exclusion in the compose step, or save becomes a silent noop.
- `disabled` marks a field frozen by publication, a field the caller's role forbids editing, or the whole form held read-only because another collaborator holds the edit lock or the api refused the last save as stale (ADR 0024); one predicate resolves all three, and the value is submitted unchanged.
