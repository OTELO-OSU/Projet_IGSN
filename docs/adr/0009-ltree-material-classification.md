# 9. Hierarchical material classification via Postgres ltree

## Status

Accepted

## Context

ADR 0008 established materialized paths as the shape for sample taxonomies (the
`type` vocabulary was the first). Material is the second such vocabulary; this
record covers the material-specific choices layered on that pattern (ltree
storage and index, the publishable-root allowlist, and key search).

A sample's material is not a flat category. It is a scientific classification
that nests several levels deep (e.g. `rock` > `igneous` > `volcanic` >
`basalt`), and the vocabulary can reach roughly 8 levels. We initially modelled
it as two flat columns (`material` plus a `rock_type` subtype), but that only
captures two levels and special-cases one branch.

Requirements that shaped the decision:

- Classify a sample to any depth, stopping early while it is still a draft.
- Search for samples by a classification key at any depth (find everything under
  `igneous`, or everything that is `basalt`), served by an index.
- The same segment value can appear under different parents; a path, not a bare
  segment, is the identity.
- The vocabulary is a controlled set of stable `lower_snake_case` codes (i18n
  rule), never labels.

## Decision

Store the classification as a single Postgres `ltree` column, `sample.material`,
with a GiST index (`sample_material_idx`). A value is a dot-joined path of codes
(`rock.igneous.volcanic.basalt`).

The vocabulary is the source of truth in `domain`, as a flat `as const` tuple
`MATERIAL_PATHS` (every node, including intermediate levels). `materialPathSchema`
is a `z.enum` over it, giving one compile-time and runtime source. Because the
parent of every non-root path is itself a member (asserted by a spec), children,
leaf-ness, and ancestors derive by string-prefix helpers (`materialChildren`,
`isMaterialLeaf`) with no tree data structure.

Publication requires two orthogonal conditions, both in `domain`:

- the path is a leaf (fully classified), and
- its root type is on the `PUBLISHABLE_MATERIAL_TYPES` allowlist (in-scope for
  the solid-Earth registry).

`samplePublishBlockers` reports `material_missing`, `material_not_publishable`,
or `material_incomplete` accordingly, and the admin label map stays an
exhaustive `Record`, so a new code fails to compile until it is translated.

The admin form classifies through cascading comboboxes derived from the tree,
bound to the single `material` field. Key search is a repository function
(`searchSamplesByMaterialKey`) using an `lquery` (`material ~ '*.<key>.*'`),
served by the GiST index.

## Alternatives rejected

- **Flat enum columns (the original `material` + `rock_type`)**: only two levels,
  special-cases the `rock` branch, cannot grow to the real depth, and cannot
  answer "everything under X" without a column per level.
- **Materialized path in a plain `text` column**: stores the same dotted string
  but needs `LIKE '%.key.%'` scans and a manual, brittle index strategy for
  ancestor/descendant queries. `ltree` gives the operators (`@>`, `<@`, `~`) and
  one GiST index for all of them.
- **`jsonb` array of segments**: expressive but heavier to query by depth and to
  index for prefix/suffix matching, and it invites storing labels or extra
  structure that the fixed vocabulary does not need.

## Consequences

- Every Postgres must have the `ltree` extension. The migration runs
  `CREATE EXTENSION IF NOT EXISTS ltree`, so dev, CI, and the
  `@kysely-vitest/postgres` test databases (which apply migrations) all get it.
- Kysely has no `ltree` type, so `db.ts` types the column as `string`. Zod
  (`materialPathSchema`) validates the value at the boundary; a JS string is
  inserted without an explicit `::ltree` cast (Postgres applies the column input
  function to the bound parameter).
- `ltree` labels accept only `[A-Za-z0-9_]`, so every path segment must match
  `^[a-z0-9_]+$` (asserted by a spec). An `lquery` key is bound as a parameter
  and cast to `lquery`; callers must validate the key against the same charset
  before searching, since an invalid key makes the cast raise.
- The vocabulary currently ships two levels: the six material roots (rock,
  sediment, mineral, fossil, synthetic_rock_mineral, extraterrestrial_rock) and
  the five rock subtypes (igneous, metamorphic, sedimentary, hydrothermal,
  unknown). `synthetic_rock_mineral` and `extraterrestrial_rock` are outside the
  solid-Earth scope, so they are omitted from `PUBLISHABLE_MATERIAL_TYPES` and
  nothing under them can be published. Adding deeper levels is a data-only change
  (extend `MATERIAL_PATHS`, the label map, and the messages); the mechanism is
  identical at any depth, and the integrity spec catches an orphan or a typo.
