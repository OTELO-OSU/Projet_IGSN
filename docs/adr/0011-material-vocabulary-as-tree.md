# 11. Material vocabulary as a segment-keyed tree

## Status

Accepted (amends ADR 0010, refines ADR 0005 and 0008)

## Context

ADR 0010 stored the material classification as a flat `as const` tuple of
dot-joined paths and chose "no tree data structure", deriving children and
leaf-ness by string prefixes. Two needs pushed past that:

- **Required vs optional depth.** Completeness meant "is a leaf", so adding a
  deeper level (e.g. `rock.hydrothermal.breccia`) would turn its parent
  incomplete and block publishing. We need some nodes to require refinement
  (`rock`, so bare `rock` never publishes) while others are valid stops with
  optional deeper levels.
- **Reuse without repetition.** The same segment recurs under several parents
  (a grain size shared across rock types). A flat list repeats every subtree per
  branch; up to ~8 levels deep that is unmaintainable.

## Decision

Author the material vocabulary as one segment-keyed tree in
`domain/sample/material.ts`, `MATERIAL_TREE`, whose nodes share a reusable
`MaterialNode` type `{ label; optional?; choices? }`:

- `label` is the paraglide message key (ADR 0005: a code, not text), resolved per
  app; translations stay in the shared `design-system` messages.
- `optional: false` marks a node that MUST be refined; absent or `true` is a valid
  stopping point. `isMaterialComplete` reads this, replacing the leaf rule.
- `choices` lists child segments; a segment is defined once and reused by listing
  its key under several parents.

A pure `expandMaterialPaths(tree, roots)` helper (ADR 0008's deferred
tree-to-paths helper) expands the tree into the flat `MATERIAL_PATHS` set, DFS in
root-then-`choices` order, throwing on a cycle. `materialPathSchema` validates a
stored value against that set. Storage is unchanged: the value is still the
dot-joined `ltree` path (ADR 0010), and the API validates it at its boundary.

Because `MATERIAL_PATHS` is now computed, it is no longer a literal tuple:
`MaterialPath` is a validated `string` rather than a union. Compile-time
exhaustiveness moves to `MaterialSegment` (`keyof typeof MATERIAL_TREE`), and
tree consistency (every `choices`/root is a node, every `label` resolves) is
asserted in specs, the same style ADR 0010 used for the parent-membership
invariant.

## Consequences

- A new level is one `MATERIAL_TREE` node plus its key in a parent's `choices`;
  making it optional is `optional: true`. Depth and reuse cost no repetition.
- ltree storage, path identity, ancestor queries, and the admin cascade are
  untouched; this is a source-representation change, and today's vocabulary
  expands to the exact same paths.
- `MaterialPath` loses its literal-union type; runtime validity is enforced by
  `materialPathSchema` at the trust boundary instead of the type system.
- The tree must stay acyclic (the expander throws otherwise), keeping the path
  set finite.
