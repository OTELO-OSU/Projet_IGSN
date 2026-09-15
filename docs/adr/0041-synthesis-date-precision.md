# 0041. Synthesis date precision and time zone

Date: 2026-09-15

## Status

Accepted. Amends ADR [0034](0034-collection-date-precision-and-time-zone.md), which left `synthesisDate` day-only.

## Context

ADR 0034 gave `collectionDate` an explicit `day | hour` precision and a required IANA time zone, and left `synthesisDate` day-only since nothing asked for the hour yet. Researchers running synthesis experiments now need the hour: a synthesis run is timed, not just dated, the same way a field collection can be.

## Decision

**`syntheticDetails.synthesisDate` becomes the same discriminated union as `collectionDate`.** `domain/sample/date-range.ts` now holds one `dateRangeSchema(codePrefix)` factory carrying the union, and both dates instantiate it with their own error-code prefix. `day` keeps `YYYY-MM-DD` bounds, `hour` adds `YYYY-MM-DDTHH:mm` wall-clock bounds and a required IANA `timeZone`, stored as entered with no conversion, exactly as ADR 0034 decided.

Persistence mirrors the collection-date migration: the two `syn_synthesis_date_*` columns become `text`, and `syn_synthesis_date_precision` / `syn_synthesis_date_time_zone` are added with the same CHECK.

**The `/service` IGSN Core mapping gains a matching deviation.** `production.processSteps[0]` gains `timestampPrecision` and `timestampTimeZone`, and its timestamps accept `YYYY-MM-DDTHH:mm`, mirroring the existing `collectionDateTimeZone` deviation. Core v0.10.0 has no precision or zone slot on a process step; this is a deliberate deviation approved by the product owner.

### Rejected

- **Keep `/service` day-only and truncate the hour on output**: loses the hour for every machine consumer reading a synthesis step, and gives a service account no way to set one on create, even though the admin form now collects it.

## Consequences

- The migration's `down` path degrades the same way the collection-date one does: casting the first ten characters back to `date` loses the time-of-day on every `hour`-precision row.
- Every consumer of `synthesisDate` (API service, admin compose/decompose, Core mapping) now reads a discriminated union instead of a flat `{ start, end }`.
