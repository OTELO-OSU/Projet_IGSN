# 0039. Two-parent sub-samples

Date: 2026-09-14

## Status

Accepted.

Amended 2026-09-14: aligned per-parent slots, gated-row cascade and one-field-per-row layout, after PO feedback on the first delivery.

## Context

A sub-sample could declare at most one parent, so a sample made by combining two existing samples had nowhere to record its second origin.

Combining two samples is a synthesis, not a split, so the result is a synthetic material with no field, no location and no geological context of its own.

The one-parent create form prefills the child from its parent by copying its fields, which has no meaning when two parents disagree.

## Decision

- A sample carries 0, 1 or 2 parents, `parentIds` capped at 2 in `createSampleSchema` and in `createServiceSampleSchema`.
- Two parents force a synthetic material (`rock_and_sediment.synthetic_rock_mineral` or below), a `createSampleSchema` refinement reported at `material`, which drops location, geological context and geomorphological environment through the existing `allowsLocation` rule.
- Parents stay write-once: `updateSampleSchema` still omits `parentIds`, so parentage is set at creation and never edited.
- The second parent is picked from `searchEligibleParents`, a repository search by name or exact IGSN over the samples the caller may declare a sub-sample of, the first parent excluded.
- One parent keeps prefilling by copy, including the inherited location; two parents prefill only `material` and `parentIds` and suggest the rest.
- A suggestion is the parent's stored value: a defaulted leaf with no stored value (`toSampleDraft(value, { defaults: false })`) yields "No value", never a draft default, while a stored value equal to the form default still gets a chip.
- In a two-parent form every inheritable field's row ends with two fixed-width slots, `[parent 1 | parent 2]`, aligned across rows, a chip when that parent holds a stored value and a disabled "No value" button otherwise.
- Non-inheritable fields (name, nature, material, parents, manual groups, relations, attachments, location and geological/geomorphological context) render no slots, and a form with no parent rule (edit, one parent) renders no slot column at all.
- A field hidden behind a gate (orientation explanation, hazard explanation, humidity %, temperature/pressure value and unit, non-selected scientific-context branch fields, numeric age unit) still shows a label + slots row while its gate is off, only when a parent has a value for it; clicking a chip applies that same parent's gate value(s) first, then the leaf, so the gate chain always comes from one parent (`FieldSuggestionCascadeProvider` names the gate fields).
- Switches (Oriented, hazard flags) are inheritable rows with yes/no chips; the copy comes from admin i18n, the kit stays label-agnostic.
- Every sample form (create with 0/1/2 parents, edit) lays out one field per row; the former multi-column groupings (temperature, humidity, pressure, measurements, age bounds, coordinates...) are gone.
- `/service` follows the same rules, `parent_not_found` naming the failing index, so `PUBLISH_BLOCKER_PATH.parent_not_found` is `["parentIds"]` and the caller appends the index.

### Rejected

- A third parent and beyond: no use case, and the cap keeps the chip UI readable.
- Copying one parent's fields and ignoring the other: silent data loss, the user cannot see which origin won.
- A per-block "use parent A" button: all-or-nothing, while a real blend takes its name from one parent and its curation from the other.
- Chips hidden until the user opens the gate by hand: two clicks to apply a suggestion behind a gate, rejected by the PO in favour of the gate cascade above.

## Consequences

- `createServiceSampleSchema` uses `safeExtend`, which inherits the base refinements, so `/service` rejects two non-synthetic parents with the same issue rather than a rule of its own.
- The material of a two-parent child is locked to the synthetic branch down to niveau 1 and open below, per ADR 0037.
- A duplicate parent id is refused by `createSampleSchema` itself (issue at `parentIds`); only per-parent eligibility stays an api check, since it needs I/O.
