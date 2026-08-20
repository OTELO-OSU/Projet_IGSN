# 0015. Hidden form values: kept while editing, dropped on save, cleared after

## Status

Accepted

## Context

Forms show and hide fields based on other values: point coordinates hide when the geometry switches to area, the country hides when the region kind switches to ocean, the whole location section hides for a synthetic material (ADR 0014). Values live in the form store, not the field components, so a hidden field keeps its value.

That persistence is deliberate, since a user who switches back recovers what they typed, but it raised two bugs. A hidden leftover reached validation, pinning an error on a field the user could not see, so save became a silent noop with no fixable error. And after a save, hidden leftovers survived in the store, so unhiding the field showed the old value as if it had been saved.

## Decision

Three rules govern any value hidden by UI state, in every form:

1. **While editing, keep it.** Hiding a field never clears its value, and switching back restores what the user entered. Mount fields so their values live in the store, not in component state that unmounts.
2. **On save, drop it.** The compose step that turns the flat draft into the domain shape excludes values hidden behind the current UI state before validation runs. A hidden value must never be submitted, and must never produce a schema error the user cannot see or fix.
3. **After a successful save, clear it.** `onSubmit` resets the form to the draft rebuilt from the submitted value, so leftovers the save dropped disappear. Visible fields are unaffected, being part of what was saved.

The reset happens when the value is handed to the save callback, not on server confirmation: if the mutation fails everything visible is still intact, and losing invisible leftovers is harmless. Threading mutation success back into the form is not worth the coupling.

In the sample form, rule 2 is `composeLocation` and the `sampleDraftSchema` preprocess; rule 3 is `form.reset(toSampleDraft(parsed))`.

## Consequences

- Switching between exclusive states is lossless during an editing session and truthful across saves.
- Every rule that hides a field needs a matching exclusion in the compose step, and the pairing is the contract: a hidden field without one resurrects the silent-noop bug.
- Client-side dropping does not replace server validation; the server still rejects the shapes the client stops sending.
