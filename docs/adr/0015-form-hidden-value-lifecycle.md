# 15. Hidden form values: kept while editing, dropped on save, cleared after

## Status

Accepted

## Context

The sample form shows and hides fields based on other values: the point
coordinates hide when the geometry switches to area (and vice versa), the
country hides when the region kind switches to ocean, the whole Location tab
hides for a synthetic material (ADR 0014). Values live in the form store, not
the field components, so a hidden field keeps its value.

That persistence is deliberate (a user who switches back recovers what they
typed), but it raised two bugs:

- A hidden leftover reached validation. A location entered before switching
  the material to synthetic made the domain schema pin an error on fields the
  user could not see: save became a silent noop with no fixable error.
- After a save, hidden leftovers survived in the store. Switching the geometry
  back showed the old coordinates as if they had been saved, when the save had
  dropped them.

## Decision

Three rules govern a value hidden by UI state:

1. **While editing, keep it.** Hiding a field never clears its value from the
   form store; switching back restores what the user entered. Mount fields so
   their values live in the store, not in component state that unmounts.
2. **On save, drop it.** The compose step that turns the flat draft into the
   domain shape (`composeLocation`, the `sampleDraftSchema` preprocess)
   excludes values hidden behind the current UI state before validation runs.
   A hidden value must never be submitted, and must never produce a schema
   error the user cannot see or fix.
3. **After a successful save, clear it.** `onSubmit` resets the form to the
   draft rebuilt from the submitted value (`form.reset(toSampleDraft(parsed))`),
   so leftovers the save dropped disappear. Visible fields are unaffected: they
   are part of what was saved. This avoids the form implying the leftovers were
   persisted.

The reset happens when the value is handed to the save callback, not on server
confirmation: if the mutation fails, everything visible is still intact, and
losing invisible leftovers is harmless. Threading mutation success back into
the form was not worth the coupling.

## Consequences

- Switching between exclusive states (point/area, continent/ocean) is lossless
  during an editing session and truthful across saves.
- Every rule that hides a field needs a matching exclusion in the compose step;
  the pairing is the contract. A hidden field without one resurrects the silent
  noop bug.
- The one exception to rule 2 stays server-enforced: `createSampleSchema` still
  rejects a location on a synthetic material, the client just stops sending it.
