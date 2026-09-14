# 0039. Two-parent sub-samples

Date: 2026-09-14

## Status

Accepted.

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
- A suggestion is a chip per parent under the field, one click filling it, fed by a form-kit `FieldSuggestionProvider` mirroring `FieldDisabledProvider`, so no control decides for itself what its parents suggest.
- `/service` follows the same rules, `parent_not_found` naming the failing index, so `PUBLISH_BLOCKER_PATH.parent_not_found` is `["parentIds"]` and the caller appends the index.

### Rejected

- A third parent and beyond: no use case, and the cap keeps the chip UI readable.
- Copying one parent's fields and ignoring the other: silent data loss, the user cannot see which origin won.
- A per-block "use parent A" button: all-or-nothing, while a real blend takes its name from one parent and its curation from the other.

## Consequences

- `createServiceSampleSchema` uses `safeExtend`, which inherits the base refinements, so `/service` rejects two non-synthetic parents with the same issue rather than a rule of its own.
- The material of a two-parent child is locked to the synthetic branch down to niveau 1 and open below, per ADR 0037.
- Duplicate parent ids and per-parent eligibility stay an api check, since the domain rule has no I/O.
