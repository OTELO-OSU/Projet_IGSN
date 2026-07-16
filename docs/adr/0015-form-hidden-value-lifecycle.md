# 15. Hidden form values: kept while editing, dropped on save, cleared after

## Status

Accepted

## Context

Forms show and hide fields based on other values. In the sample form: point
coordinates hide when the geometry switches to area, the country hides when
the region kind switches to ocean, the whole Location tab hides for a
synthetic material (ADR 0014). Values live in the form store, not the field
components, so a hidden field keeps its value.

That persistence is deliberate (a user who switches back recovers what they
typed), but it raised two bugs:

- A hidden leftover reached validation. The schema pinned an error on a field
  the user could not see: save became a silent noop with no fixable error.
- After a save, hidden leftovers survived in the store. Unhiding the field
  showed the old value as if it had been saved, when the save had dropped it.

## Decision

Three rules govern any value hidden by UI state, in every form:

1. **While editing, keep it.** Hiding a field never clears its value from the
   form store; switching back restores what the user entered. Mount fields so
   their values live in the store, not in component state that unmounts.
2. **On save, drop it.** The compose step that turns the flat draft into the
   domain shape excludes values hidden behind the current UI state before
   validation runs. A hidden value must never be submitted, and must never
   produce a schema error the user cannot see or fix.
3. **After a successful save, clear it.** `onSubmit` resets the form to the
   draft rebuilt from the submitted value, so leftovers the save dropped
   disappear. Visible fields are unaffected: they are part of what was saved.
   This avoids the form implying the leftovers were persisted.

The reset happens when the value is handed to the save callback, not on server
confirmation: if the mutation fails, everything visible is still intact, and
losing invisible leftovers is harmless. Threading mutation success back into
the form is not worth the coupling.

In the sample form, rule 2 is `composeLocation` and the `sampleDraftSchema`
preprocess; rule 3 is `form.reset(toSampleDraft(parsed))`.

## Consequences

- Switching between exclusive states is lossless during an editing session and
  truthful across saves.
- Every rule that hides a field needs a matching exclusion in the compose step;
  the pairing is the contract. A hidden field without one resurrects the silent
  noop bug.
- Client-side dropping does not replace server validation: the server still
  rejects shapes the client stops sending (e.g. `createSampleSchema` rejects a
  location on a synthetic material).
