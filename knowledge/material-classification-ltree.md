---
type: persistence
title: Material classification stored as ltree
description: >-
  sample.material is one Postgres ltree column with a GiST index, holding a
  dot-joined path of vocabulary codes.
resource: packages/api/migrations#ltree
tags:
  - persistence
  - sample
  - vocabulary
relations:
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: kysely-dbal
status: stable
---

A sample's material is a scientific classification nesting up to ~8 levels (`rock.igneous.volcanic.basalt`), stored as a single Postgres `ltree` column, `sample.material`, with a GiST index (`sample_material_idx`).

- A value is a dot-joined path of codes, and an ancestor path is a valid partial classification, so a draft can stop early. The path, not the bare segment, is the identity, since a segment recurs under different parents.
- The vocabulary is the source of truth in `domain` ([[vocabulary-tree]]), enforced by `materialPathSchema` at the api boundary; the database does not duplicate it.
- Publication requires a complete path ([[publish-blockers]]).
- Every Postgres must carry the `ltree` extension; the migration runs `CREATE EXTENSION IF NOT EXISTS ltree`, so dev, CI and the test databases all get it.
- Kysely has no `ltree` type, so `db.ts` types the column as `string`; a JS string inserts with no explicit cast, Postgres applying the column input function.
- `ltree` labels accept only `[A-Za-z0-9_]`, so every path segment must match `^[a-z0-9_]+$`, asserted by a spec.
- A hierarchy facet filters with an ancestor predicate (`<@ ... ::ltree`, in `api/src/sample/service/facet-filter.ts`), served by the GiST index at any depth with no per-level schema change ([[search-facets]]).
- Renaming or restructuring a code needs a data migration of stored paths, the usual materialized-path trade-off.
