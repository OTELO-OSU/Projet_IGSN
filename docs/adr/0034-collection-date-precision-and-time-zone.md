# 0034. Collection date precision and time zone

Date: 2026-09-03

## Status

Accepted.

## Context

A sample's `collectionDate` was `{ start, end }` of `YYYY-MM-DD` strings (a single date stored as `start === end`), backed by two `date` columns. Some researchers know the hour of collection, not just the day, and a stored midnight must stay distinguishable from "no time given". A time also means nothing without a zone: `08:30` alone cannot be compared or displayed correctly across researchers.

## Decision

**`collectionDate` gains an explicit `precision` (`day | hour`), a discriminated union in `domain`:** `day` keeps `YYYY-MM-DD` bounds, `hour` adds `YYYY-MM-DDTHH:mm` wall-clock bounds and a required IANA `timeZone`. The two bounds of a range share one precision and, at `hour`, one zone.

**The wall clock is stored as the text the researcher entered, with no conversion anywhere.** The two columns become `text` holding the bound in its API shape (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`); two new columns, `collection_date_precision` and `collection_date_time_zone`, say how to read it, the zone written only at `hour` precision and enforced by a CHECK. Zod validates the shape at the trust boundary, and no query sorts, filters, or facets on the bound, so Postgres typing it buys nothing today.

`synthesisDate` (synthetic samples) stays day-only: nothing in this ticket asked for an hour-precision synthesis date, and it keeps its own `dateRangeSchema` sharing only the extracted order/future check (`dateRangeIssues`) with `collectionDate`.

**Public `GET /samples/:igsn` returns `collectionDate` as the same discriminated union**, so a consumer reading `precision` gets the right shape without a separate flag.

### Rejected

- **Keep `date` columns plus a wall-clock text bound for the hour case**: two storage shapes for one logical field, and every reader would need to branch on which columns are populated instead of reading one `precision` discriminant already carried in the row.
- **Store UTC only and derive the local time from a client-supplied zone at render time**: loses the zone the sample was actually collected in the moment two admins in different zones view or edit the record, and re-derives a value that should be a stored fact, not a runtime guess.
- **`timestamptz` columns, converting with `AT TIME ZONE <zone>` on write and `Intl.DateTimeFormat` on read**: the zone sits in its own column anyway, so the instant is derivable and the two conversions only add a place to drift (Postgres and ICU each carry their own tzdata) for nothing a reader asks for; a wall clock in a DST fold also maps to two instants, so the conversion loses what was entered.
- **`timestamp` (without time zone) columns**: the right type on paper, but postgres.js turns every `timestamp` into a JS `Date` on read and through `new Date(x).toISOString()` on write, both in the api process's own zone, so the wall clock only survives in a UTC process or behind a driver type override shared with the test client.
- **A JS time-zone conversion library**: nothing is converted, and `Intl.DateTimeFormat` already validates a zone name with the platform's IANA database.

## Also decided (same tab, same ticket)

The four yes/no comboboxes (`description.oriented`, `security.radioactivity`, `security.asbestosRich`, `security.chemicalRisk`) become switches defaulting to `false`. The third state, "not answered", is dropped: `description` and `security` are now always submitted, every hazard flag always present.

### Rejected

- **Keep the combobox with a "not answered" option and add a switch elsewhere**: the product decision was to drop the third state outright, not relabel it; carrying both a switch and an unanswered state would reopen the ambiguity the change removes.

## Consequences

- The migration's `down` path degrades: casting the first ten characters back to `date` loses the time-of-day on every `hour`-precision row. Rolling back after `hour` rows exist is destructive; there is no round-trip-safe down migration for this data.
- Every consumer of `collectionDate` (API service, admin compose/decompose, frontend rendering) now reads a discriminated union instead of a flat `{ start, end }`, so a new caller must handle both `day` and `hour` rather than assuming two plain date strings.
- A sample created before this change with no `oriented`/hazard answer now reads as `false` ("no") rather than "unanswered"; the distinction is gone from every existing draft the moment it is next saved, and the public view has no third state left to render.
- The time-zone control (`description.collectionDateTimeZone`) joins the `collectionDate` entry of `LOCKED_DESCRIPTION_FIELDS_TO_FORM_FIELDS`; the time-mode switch renders no field of its own and follows the start bound's lock, so precision and zone freeze with the rest of the collection date on a published sample; see [published-field-lock.ts](../../packages/domain/src/sample/publication/published-field-lock.ts) and ADR [0021](0021-post-publish-field-mutability.md).
