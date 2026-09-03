---
type: practice
title: Form kit and the hidden-value lifecycle
description: >-
  Every form uses useAppForm with a domain Zod schema; a hidden value is kept
  while editing, dropped on save, cleared after.
resource: .claude/rules/forms.md
tags:
  - forms
  - admin
  - design-system
relations:
  - type: depends_on
    target: zod-single-source-of-truth
status: stable
---

Build every form with `useAppForm` from `@projet-igsn/design-system/components/form/app-form`, never raw `@tanstack/react-form`, passing per-form `defaultValues` and `validators` (a Zod schema from `domain`). Reuse the bound inputs (`TextField`, `SubmitButton`) via `form.AppField` / `form.AppForm`; a missing input is added to `packages/design-system/src/components/form/` and registered in `app-form.tsx`, never inlined in an app.

**Required marker.** Required means required to publish, not to save a draft: a field whose absence blocks publication carries a trailing "\*" in its label, in text and never colour alone. A conditional requirement adds the marker the moment it starts to hold and drops it when it stops (`withRequired`).

**Dependent fields** (a unit without its value): hide it until the sibling is set, mark it required once shown, have the schema reject its value while the sibling is missing, and gate the render and the compose exclusion on one shared helper.

**Hidden values, three rules for any value hidden by UI state, in every form:**

1. While editing, keep it. Hiding never clears, and switching back restores what the user typed, so fields mount with their values in the form store rather than in component state.
2. On save, drop it. The compose step excludes values hidden behind the current UI state before validation runs, so a hidden value never raises a schema error the user cannot see, which would make save a silent noop.
3. After a successful save, clear it. `onSubmit` resets the form to the draft rebuilt from the submitted value, so leftovers the save dropped do not look saved. The reset happens when the value is handed to the save callback, not on server confirmation.

In the sample form, rule 2 is `composeLocation` plus the `sampleDraftSchema` preprocess, rule 3 is `form.reset(toSampleDraft(parsed))`. Every rule that hides a field needs its matching exclusion, and client-side dropping never replaces server validation.

**Repeatable rows are never dropped silently.** A blank row in a list (a relation) is composed as is and fails the save on its required fields, gated per field, so the user removes it explicitly instead of losing a half-filled entry; the compose step only excludes values hidden behind UI state (rule 2), never a whole row.

**Every field reserves its message line.** `FieldError` renders a `min-h-5` box whether or not an error shows, and the hint line keeps the same height, so a message appearing never shifts the form.

**`disabled` means one of three things**, resolved by one predicate: frozen by publication ([[published-field-locks]]), forbidden to the caller's role, or the whole form read-only because another collaborator holds the edit lock or the api refused the last save as stale. The value is submitted unchanged. A field waiting on a sibling is not rendered rather than disabled.
