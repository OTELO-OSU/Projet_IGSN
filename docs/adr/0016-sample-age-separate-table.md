# 16. Sample geological age in a separate 0:1 table

## Status

Accepted.

## Context

A sample gains a geological **age**: a composite, mostly-optional structure with
two independent, and/or-combined blocks plus a free-text field:

- a **numeric age**, either a single value or a min+max range, qualified by a
  unit (`a`/`ka`/`ma`/`ga`) and a years unit (`ce`/`bce`/`bp`/`cal_bp`);
- a **stratigraphic time scale age** (ICS chronostratigraphic codes), again a
  single value or a min+max range;
- a free-text **geological unit** (lithostratigraphic unit).

Every other sample sub-datum so far (type, material, texture, collection method
and its description, specific name) is a nullable column on the single `sample`
table. Age has nine correlated fields with mutually-exclusive shapes
(single vs range) and cross-field rules, which is a different weight of data.

## Decision

Store the age in a dedicated `sample_age` table with a 0:1 relationship to
`sample`: `sample_id` is both the primary key and a `references("sample.id")`
foreign key with `on delete cascade`. A sample has at most one age row; an empty
age is simply no row.

The nine columns are all nullable: three `double precision` numeric columns
(ages are approximate measurements, so a float is enough and the driver reads
them as JS numbers, avoiding the `numeric`-as-string round-trip), two unit
`text` columns, three `text` columns holding ICS codes, and a `text` geological
unit.

The shape and rules live in `domain`: `age/model.ts` (`ageSchema`) with a
`superRefine` enforcing single-XOR-range, both-ends-of-a-range, and
unit-requires-a-value, mirroring the existing texture guard. `sampleSchema`
carries `age: ageSchema.nullable()`. The ICS scale is a flat `z.enum`
(`ics1`..`ics49`), not a tree; labels are per-app `Record<Code, () => string>`
maps, so a new code fails to compile until translated (i18n rule).

The repository writes and reads the age row in the same transaction as the
sample (an `upsert-sample-age` helper: upsert when present, delete when null),
so create/update stay atomic. `to-sample` takes the optional age row and maps it.

## Alternatives rejected

- **Flat nullable columns on `sample`** (the pattern used by every other
  sub-datum): would widen `sample` by nine loosely-related, mostly-null columns
  whose validity depends on each other. The age is a cohesive optional
  sub-entity; a side table keeps `sample` focused and models the 0:1 explicitly.
- **`jsonb` column**: avoids the join but loses column-level typing and makes
  future per-field querying (e.g. "samples older than X Ma") a JSON expression
  instead of an indexable column.

## Consequences

- First use of a foreign key in the schema. `on delete cascade` removes the age
  with its sample; no orphan cleanup needed.
- Reads that need the age do a keyed second query (single-get paths) or one
  batched `where sample_id in (...)` query for a list page, so there is no row
  multiplication and no N+1.
- `sampleSchema.age` is defaulted to `null`, so a payload that omits the key
  reads as "no age recorded"; `to-sample` always supplies it explicitly.
- Age never blocks publication (no entry in `samplePublishBlockers`). If that
  changes, add a code there and a translated label, per the publish-constraints
  rule.
