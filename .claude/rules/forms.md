---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# Forms

Build every form with `useAppForm` from
`@projet-igsn/design-system/components/form/app-form`, not raw
`@tanstack/react-form`. It yields fields and actions pre-bound to the shared,
accessible form inputs; pass per-form `defaultValues` and `validators` (a zod
schema from `domain`).

Reuse the existing bound inputs (`TextField`, `SubmitButton`...) via
`form.AppField` / `form.AppForm`. Need an input the kit doesn't have yet? Add it
to `packages/design-system/src/components/form/` and register it in `app-form.tsx`
so every form gets it, never inline a one-off input in an app.

## Required marker

Required means required to publish, not to save a draft: a field whose absence
blocks publication carries a trailing "\*" in its label, in text, never color
alone. A conditional requirement adds the marker the moment it starts to hold
and drops it when it stops (`withRequired`).

## Dependent fields

Is a field meaningless until a sibling is filled (a unit without its value)?
Hide it until the sibling is set, mark it required once shown, and have the
schema reject its value while the sibling is missing. Gate the render and the
compose exclusion on the exact same expression, a shared helper both call,
not two expressions that happen to agree.

## Hidden values (ADR 0015)

Values hidden by UI state (a field for the other branch of a toggle, a tab
hidden by another value) follow three rules:

1. While editing, keep them: hiding a field never clears its value, so
   switching back restores what the user entered. Values live in the form
   store, not in component state that unmounts.
2. On save, drop them: the compose step excludes values hidden behind the
   current UI state before validation, so a hidden value is never submitted
   and never raises a schema error the user cannot see or fix.
3. After a successful save, clear them: reset the form to the draft rebuilt
   from the submitted value, so dropped leftovers do not look saved. Visible
   fields are unaffected.

Every rule that hides a field needs its matching exclusion in the compose
step; a hidden field without one turns save into a silent noop. `disabled`
now marks a field frozen by publication, and nothing else; its value is
submitted unchanged.
