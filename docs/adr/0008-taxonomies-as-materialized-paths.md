# 8. Taxonomies as materialized paths

## Status

Accepted

## Context

Samples carry hierarchical controlled vocabularies: a type refined by
sub-values, up to ~5 levels deep (e.g. rock > igneous > volcanic). A sub-value
has no meaning on its own; it only expands its parent. More vocabularies of
this shape are expected. Options considered: one column per level
(`type`, `sub_type_1`...), an array column, a lookup table with `parent_id`,
or a single path value.

## Decision

Store a hierarchical classification as one text column holding the
dot-separated path of codes from the root, e.g. `rock.igneous.volcanic`.
An ancestor path (`rock`) is a valid, partial classification.

The vocabulary itself is a flat Zod enum of paths in `domain`
(`sample/type.ts`), the single definition behind the form selects, i18n
labels, API validation, and database values. A generic tree-to-paths
helper was considered and dropped while there is one taxonomy; add it
when a second vocabulary lands. The database does not
duplicate the vocabulary in a CHECK constraint; the API validates through
the domain schema at its trust boundary.

## Consequences

- A new taxonomy is one `z.enum` of paths; depth changes need no schema
  migration.
- The column uses the Postgres `ltree` type: the codes are valid ltree labels,
  ancestor queries are native (`type <@ 'core'`, GiST-indexable when needed),
  and the database rejects malformed paths. The driver reads and writes it as
  text, so application code sees plain strings.
- Renaming or restructuring a code requires a data migration of stored paths,
  the usual materialized-path trade-off.
- Vocabularies are fixed at deploy time; runtime-editable taxonomies would
  need a lookup table instead.
