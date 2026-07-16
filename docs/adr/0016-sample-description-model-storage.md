# 15. Sample description: model and flat-column storage

## Status

Accepted

## Context

A sample needs a physical **description**: a collection date (a single date or
a date range), an orientation flag with an optional free-text explanation, an
open free-text description, and size (length, width, thickness), mass and
volume measurements, each carrying its own unit. All fields are optional on a
draft; the collection date is required to publish. There is at most one
description per sample, and none of it is searchable or indexed today.

## Decision

**Domain model** (`domain/sample/description/`): `sample.description` is
nullable; when present its parts are independent and optional.

```
description = {
  collectionDate?:         { start, end }            // ISO dates, start <= end
  oriented?:               boolean                    // null until answered
  orientationExplanation?: string                     // only when oriented === true
  openDescription?:        string
  length?:                 { value, unit: mm|cm|dm|m }
  width?:                  { value, unit: mm|cm|dm|m }
  thickness?:              { value, unit: mm|cm|dm|m }
  mass?:                   { value, unit: mg|g|kg }
  volume?:                 { value, unit: mm3|cm3|dm3|m3|ml|l }
}
```

**A single date is the degenerate range `start === end`.** Only the range is
stored; "single date or range" is a form toggle, not a data shape. The form
shows one date input when `start === end` (writing the value to both ends) and
two otherwise. This mirrors the elevation range in ADR 0014 and avoids a
union in the schema, a discriminator column, and a two-shape API.

**Dates are `z.iso.date()` strings (`YYYY-MM-DD`), stored as Postgres `date`.**
Collection dates are day-precise facts with no timezone; a `Date`/`timestamp`
round-trip would invent a midnight-UTC instant that can render as the previous
day in western timezones. Strings compare correctly (`start <= end`) and bind
natively to `<input type="date">`.

**A unit is mandatory exactly when its value is set**, modeled structurally: a
nullish `{ value, unit }` object with both members required. No `superRefine`
can be forgotten and the type system carries the rule. Length, width and
thickness each hold their own unit (per the validated design), so a 30 cm x
5 mm core needs no shared-unit compromise.

**Flat nullable columns on `sample`**, one migration
(`collection_date_start`, `collection_date_end`, `oriented`,
`orientation_explanation`, `open_description`, and `value`/`unit` pairs for
`length`, `width`, `thickness`, `mass`, `volume`). Unlike location (ADR 0014)
there is no spatial index, no extension, and no width concern that justifies a
1:1 side table: these are 13 narrow scalar columns read and written with the
row they describe. `to-sample.ts` folds them into the nested `description`
(null when every column is null); insert/update spread them back.

**Publish gating** follows the single-source-of-truth pattern: a new
`collection_date_missing` code in `publishBlockerSchema`, pushed by
`samplePublishBlockers` when `description?.collectionDate` is null. The admin
label map is exhaustive, so it fails to compile until translated.

**Vocabularies** stay codes per the i18n rule: `size_unit` (`mm|cm|dm|m`),
`mass_unit` (`mg|g|kg`), `volume_unit` (`mm3|cm3|dm3|m3|ml|l`) as small Zod
enums with translated label maps in `domain/messages` (label maps rather than
raw codes so `mm3` can render as "mm³" and `l` as "L").

## Alternatives rejected

- **`jsonb` description column**: opaque to Kysely, cast-per-field access, and
  no schema enforcement in the database; saves nothing since the shape is flat.
- **1:1 `description` table like location**: pays a join and an upsert/delete
  dance for no isolating benefit; location earned its table with a GiST index
  and PostGIS types, description has neither.
- **Union model `date | { start, end }`**: two shapes to validate, store, and
  render everywhere, plus a migration if single dates later need to become
  ranges. The degenerate range is strictly simpler and loses no information.
- **`Date` objects / `timestamptz` for collection dates**: timezone-shifted
  rendering bugs for a value that has no time component.
- **Shared unit for length/width/thickness**: contradicts the validated
  design; real cores mix scales (long axis in cm, thickness in mm).
- **`superRefine` for unit-requires-value**: a structural `{ value, unit }`
  object enforces it for free and cannot drift.
- **Requiring the collection date at creation**: breaks the draft-first flow
  every other field follows (material, type, location).

## Consequences

- One additive migration; no infrastructure or image change.
- `Sample` stays one type carrying `description: Description | null`.
- **Admin**: a description section in the sample form; a `DateField`
  (native `<input type="date">`) is added to the design-system form kit,
  joining `NumberField` from ADR 0014. The single/range toggle is local UI
  state derived from `start === end`.
- **Frontend**: a `description-view.tsx` block on the public sample page,
  hidden when `description` is null.
- Publishing an existing draft now requires a collection date; already
  published samples are unaffected (blockers gate the transition, not the
  published state).
- If description search is ever needed (e.g. filter by collection year), the
  columns are already first-class and indexable; nothing to unpack.
