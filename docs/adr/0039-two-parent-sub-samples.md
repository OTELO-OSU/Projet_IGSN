# 0039. Two-parent sub-samples

Date: 2026-09-14

## Status

Accepted.

Amended 2026-09-14: aligned per-parent slots and one-field-per-row layout, after PO feedback on the first delivery.

Amended 2026-09-14: a chip fills only its own field, no gate cascade, after a PO bug report on the first amendment.

## Context

A sub-sample could declare at most one parent, so a sample made by combining two existing samples had nowhere to record its second origin.

Combining two samples is a synthesis, not a split, so the result is a synthetic material with no field, no location and no geological context of its own.

The one-parent create form prefills the child from its parent by copying its fields, which has no meaning when two parents disagree.

## Decision

- A sample carries 0, 1 or 2 parents, `parentIds` capped at 2 in `createSampleSchema` and the parent relations capped at 2 in `coreSampleSchema`.
- Two parents force a synthetic material (`rock_and_sediment.synthetic_rock_mineral` or below), a `createSampleSchema` refinement reported at `material`, which drops location, geological context and physiographic environment through the existing `allowsLocation` rule.
- Parents stay write-once: `updateSampleSchema` still omits `parentIds`, so parentage is set at creation and never edited.
- The second parent is picked from `searchEligibleParents`, a repository search by name or exact IGSN over the samples the caller may declare a sub-sample of, the first parent excluded.
- One parent keeps prefilling by copy, including the inherited location; two parents prefill only `material` and `parentIds` and suggest the rest.
- A suggestion is the parent's stored value: a defaulted leaf with no stored value (`toSampleDraft(value, { defaults: false })`) yields "No value", never a draft default, while a stored value equal to the form default still gets a chip.
- In a two-parent form every inheritable field's row ends with two fixed-width slots, `[parent 1 | parent 2]`, aligned across rows and with the input, each labelled with its parent's name above the chip, ellipsis-truncated with a tooltip for the full value; a chip when that parent holds a stored value and a disabled "No value" button otherwise.
- Non-inheritable fields (name, nature, material, parents, manual groups, relations, attachments, location and geological/physiographic context) render no slots, and a form with no parent rule (edit, one parent) renders no slot column at all.
- A field hidden behind a gate (orientation explanation, hazard explanation, humidity %, temperature/pressure value and unit, non-selected scientific-context branch fields, numeric age unit) shows no row while its gate is closed; the user opens the gate through the gate's own chips (Oriented "Yes", a type, a Provenance value) or by hand, and the field then appears with its chips. A chip fills only its own field, with no side effect beyond what the same edit would have on a no-parent sample.
- Switches (Oriented, hazard flags) are inheritable rows with yes/no chips; the copy comes from admin i18n, the kit stays label-agnostic.
- Every sample form (create with 0/1/2 parents, edit) lays out one field per row; the former multi-column groupings (temperature, humidity, pressure, measurements, age bounds, coordinates...) are gone.
- `/service` follows the same rules, `parent_not_found` naming the failing relation at `relations.<i>.targetIdentifier.value`.

### Rejected

- A third parent and beyond: no use case, and the cap keeps the chip UI readable.
- Copying one parent's fields and ignoring the other: silent data loss, the user cannot see which origin won.
- A per-block "use parent A" button: all-or-nothing, while a real blend takes its name from one parent and its curation from the other.
- One click, cascade the gate: applying a chip also opened its gate (and set the gate value), rejected by the PO because a decision down the line must not change an earlier one; a chip fills its target field only.

## Consequences

- `/service` reshapes its Core body through `fromCoreSample` and runs `createSampleSchema` itself, so it rejects two non-synthetic parents with the same issue rather than a rule of its own.
- The material of a two-parent child is locked to the synthetic branch down to niveau 1 and open below, per ADR 0037.
- A duplicate parent id is refused by `createSampleSchema` itself (issue at `parentIds`); only per-parent eligibility stays an api check, since it needs I/O.
