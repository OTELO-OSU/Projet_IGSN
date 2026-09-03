---
type: domain-model
title: Sample vocabularies as segment-keyed trees
description: >-
  Every sample vocabulary is one segment-keyed TreeNode tree in domain, expanded
  to flat dot-paths by expandPaths, with per-node completeness.
resource: packages/domain/src/sample/path/tree-node.ts
tags:
  - domain
  - vocabulary
  - sample
relations:
  - type: depends_on
    target: i18n-strategy
status: stable
---

Every hierarchical sample vocabulary (material, sample type, collection method, economic interest) is authored as one segment-keyed tree of the shared `TreeNode` type (`domain/sample/path/tree-node.ts`), keyed by `lower_snake_case` code.

Node fields, all optional:

- `label`: the paraglide message key, a code and never text, resolved per app with translations in the shared `domain` messages ([[i18n-strategy]]).
- `choices`: child segment keys, so a segment is defined once and reused by listing its key under several parents.
- `optional: false`: this node MUST be refined; absent or `true` is a valid stopping point, which `isMaterialComplete` and `isSampleTypeComplete` read in place of a leaf rule.
- `frozenWhenPublished: false`: opens the node after publication ([[material-levels-editable]]).
- `searchable`: the public search-facet policy alone ([[search-facets]]); the admin collection-method filter offers every level regardless.

Mechanics:

- Pure `expandPaths(tree, roots)` expands the tree to a flat path set (`MATERIAL_PATHS`), DFS in root-then-`choices` order, throwing on a cycle at import time, so the path set stays finite.
- `materialPathSchema` validates a stored value against that set at the trust boundary; the DB holds no CHECK constraint. So a path type is a validated `string`, not a union, and compile-time exhaustiveness lives on the segment keys (`MaterialSegment`).
- `resolvePathNode` resolves a path by longest-matching-suffix, which is how a dotted context override works.
- Each vocabulary exports its bundle (`MATERIAL_HIERARCHY`, `SAMPLE_TYPE_HIERARCHY`, `COLLECTION_METHOD_HIERARCHY`), so the stop policy is stated once per source of truth: collection method marks its non-leaves `optional: true`, material and type mark nothing.
- Adding a value is pure data: one tree node plus its key in a parent's `choices`, no migration and no UI change. Use the `add-sample-vocabulary` skill.
