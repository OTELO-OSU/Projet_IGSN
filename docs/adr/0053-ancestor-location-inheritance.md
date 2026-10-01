# 0053. Ancestor location inheritance

Date: 2026-09-29

## Status

Accepted.

Amends the location sentence of ADR [0039](0039-two-parent-sub-samples.md), which had a sub-sample inherit location from a sole parent only. ADR [0045](0045-sub-sample-collection-date-and-public-list-default.md) (collection date) is untouched.

## Context

A sub-sample may never set its own location, yet a location-less parent left it with nothing to inherit and `location_position_missing` blocked its publication.

The import and `/service` also substituted the parent's location before validation, so they validated a value the sample never stored.

## Decision

- `location_position_missing` applies only to parentless samples. A sample with a parent has no location requirement, with no substitute error and no other check.
- At creation, a one-parent sub-sample copies its parent's `location_id` (`api/src/sample/service/inherit-parent-location.ts`).
- Since every sub-sample inherits at creation, that pointer already is the nearest located ancestor's on its one-parent line, with no climb needed.
- A two-parent sample is synthetic and location-less (ADR 0039), so its children inherit none.
- The pointer is shared, never copied, and inheritance stays creation-only.
- The admin form, `/service` and the Excel import share that one function, and the last two no longer substitute the parent's location before validation.
- Filling a location alongside a parent stays the `location_inherited_from_parent` error.

## Rejected

- Substituting the inherited location at validation time in each caller: it validates a location never stored and duplicates the lookup in three places.
- A recursive climb to the nearest located ancestor at creation: creation-time inheritance already leaves that ancestor's pointer on the parent, so the climb never finds more than the parent's own column.
