# 17. Elevation completeness gates publish, not the draft

## Status

Accepted. Amends ADR 0014.

## Context

ADR 0014 stated a sample elevation as a range with a shared `unit` and `datum`
"required once present", enforced in `elevationSchema`. Because a draft save
validates against the same domain schema (`createSampleSchema`, via
`sampleDraftSchema`), entering an elevation value immediately raised errors on
the unit, datum, and the missing range bound, and blocked saving the draft.

This is inconsistent with age (ADR 0016 as amended): a numeric age can be saved
in a draft without its unit, and completeness is enforced only at publish via
`samplePublishBlockers`. A researcher filling a draft should be able to record a
partial elevation and complete it later, the same way.

## Decision

Elevation completeness gates publication, not the draft.

- `elevationSchema` types every part as nullish (`min`, `max`, `unit`, `datum`).
  Only the data-validity invariants stay in the schema: whole numbers
  (`.int()`) and `min <= max` when both bounds are present.
- Two new `publishBlockerSchema` codes carry the completeness rules:
  `elevation_unit_datum_missing` (an elevation with no unit or no datum) and
  `elevation_range_incomplete` (only one of min/max set). Both derive from
  `sample.location.position.elevation` in `samplePublishBlockers`, and the admin
  label map translates them (per the publish-constraints rule).
- The admin form keeps the "\*" marker and the disabled-until-a-value behaviour
  on unit/datum and the range bounds, but drops their `onChange` required
  validators. The marker is now a publish hint, not a draft error. The
  non-integer check stays live (data validity).

## Consequences

- A draft may hold a partial elevation (a value without unit/datum, or a
  half-entered range) and save cleanly; publication is blocked until complete.
- Elevation now follows the same draft-vs-publish split as age, so the two read
  the same way in the form and in the blocker list.
- The frontend detail view only renders published (complete) elevations, but the
  loosened types mean `elevationText` appends unit and datum only when present.
