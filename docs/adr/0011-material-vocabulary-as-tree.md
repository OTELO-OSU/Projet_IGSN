# 0011. Material vocabulary as a segment-keyed tree

## Status

Accepted (amends ADR 0010, refines ADR 0005)

## Context

ADR 0010 authored the vocabulary as a flat `as const` tuple of dot-joined paths, deriving children and leaf-ness by string prefixes. Two needs pushed past that:

- **Required vs optional depth.** Completeness meant "is a leaf", so adding a deeper level would turn its parent incomplete and block publishing. Some nodes must require refinement (a bare `rock` never publishes) while others are valid stops with optional deeper levels.
- **Reuse without repetition.** The same segment recurs under several parents (a grain size shared across rock types), and a flat list repeats every subtree per branch, unmaintainable at ~8 levels.

## Decision

Author the vocabulary as one segment-keyed tree, `MATERIAL_TREE` in `domain/sample/material/classification.ts`, whose nodes share the reusable `TreeNode` type (`domain/sample/path/tree-node.ts`):

- `label` is the paraglide message key (ADR 0005: a code, not text), resolved per app, translations living in the shared `design-system` messages.
- `optional: false` marks a node that MUST be refined; absent or `true` is a valid stopping point, which `isMaterialComplete` reads in place of the leaf rule.
- `choices` lists child segments, so a segment is defined once and reused by listing its key under several parents.

A pure `expandPaths(tree, roots)` expands the tree into the flat `MATERIAL_PATHS` set, DFS in root-then-`choices` order, throwing on a cycle, and `materialPathSchema` validates a stored value against that set. Storage is unchanged: the dot-joined ltree path of ADR 0010. Every other sample vocabulary (type, collection method, economic interest) now uses the same shape and the same expander.

Because `MATERIAL_PATHS` is computed rather than a literal tuple, `MaterialPath` is a validated `string` rather than a union. Compile-time exhaustiveness moves to `MaterialSegment`, the tree's segment keys, and tree consistency (every `choices` entry and root is a node, every `label` resolves) is asserted in specs.

## Consequences

- A new level is one tree node plus its key in a parent's `choices`, so depth and reuse cost no repetition.
- ltree storage, path identity, ancestor queries and the admin cascade are untouched: a source-representation change that expands to the same paths.
- Runtime validity is enforced by `materialPathSchema` at the trust boundary rather than by the type system.
- The tree must stay acyclic, the expander throwing otherwise, which keeps the path set finite.
