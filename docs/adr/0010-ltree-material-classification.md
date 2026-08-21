# 0010. Hierarchical material classification via Postgres ltree

## Status

Accepted. ADR 0011 replaced the flat vocabulary tuple with an authored tree expanding to the same paths; the ltree storage below is unchanged.

## Context

A sample's material is a scientific classification nesting several levels deep (`rock` > `igneous` > `volcanic` > `basalt`), reaching roughly 8 levels. It was first modelled as two flat columns (`material` plus a `rock_type` subtype), which captures two levels and special-cases one branch.

Requirements that shaped the decision:

- Classify a sample to any depth, stopping early while it is still a draft.
- Filter by a classification key at any depth (everything under `igneous`, or everything that is `basalt`), served by an index.
- The same segment can appear under different parents, so the path, not the bare segment, is the identity.
- The vocabulary is a controlled set of stable `lower_snake_case` codes (i18n rule), never labels.

## Decision

Store the classification as a single Postgres `ltree` column, `sample.material`, with a GiST index (`sample_material_idx`). A value is a dot-joined path of codes, and an ancestor path is a valid, partial classification.

The vocabulary is the source of truth in `domain` (ADR 0011 gives its shape), enforced by `materialPathSchema` at the api trust boundary; the database does not duplicate it in a CHECK constraint. Publication requires a complete path, `samplePublishBlockers` reporting `material_missing` or `material_incomplete`, and the admin label map stays an exhaustive `Record`, so a new code fails to compile until it is translated.

## Alternatives rejected

- **Flat enum columns** (the original `material` + `rock_type`): two levels only, special-cases the `rock` branch, and cannot answer "everything under X" without a column per level.
- **A materialized path in a plain `text` column**: the same dotted string, but ancestor queries need `LIKE '%.key.%'` scans and a brittle manual index strategy. `ltree` gives the operators (`@>`, `<@`, `~`) and one GiST index for all of them.
- **A `jsonb` array of segments**: heavier to query by depth and to index for prefix matching, and it invites storing labels or extra structure the fixed vocabulary does not need.
- **A lookup table with `parent_id`**: a join per level, for a vocabulary that is fixed at deploy time. A runtime-editable taxonomy would need it.

## Consequences

- Every Postgres must have the `ltree` extension. The migration runs `CREATE EXTENSION IF NOT EXISTS ltree`, so dev, CI and the `@kysely-vitest/postgres` test databases all get it.
- Kysely has no `ltree` type, so `db.ts` types the column as `string`. Zod validates at the boundary and a JS string is inserted with no explicit `::ltree` cast, Postgres applying the column input function to the bound parameter.
- `ltree` labels accept only `[A-Za-z0-9_]`, so every path segment must match `^[a-z0-9_]+$`, asserted by a spec.
- A hierarchy facet filters with an ancestor predicate (`<@ ... ::ltree`, in `api/src/sample/service/facet-filter.ts`), served by the GiST index at any depth with no per-level schema change.
- Renaming or restructuring a code requires a data migration of stored paths, the usual materialized-path trade-off.
