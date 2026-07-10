# 12. Hierarchy tree as the HierarchySelectField prop

## Status

Accepted (builds on ADR 0011)

## Context

`HierarchySelectField` received three correlated props derived from one
source: `choices` (the flat expanded paths), `canStopAt` (the stop policy),
and `getLabel`. The first two are both projections of the vocabulary tree
(ADR 0011), and `canStopAt` was a free-form function a caller could pass in
contradiction with the tree, letting the UI's "stop here" options drift from
the domain's completeness verdict that gates publishing.

## Decision

The widget receives the tree itself as one self-describing `hierarchy` prop,
`{ roots, nodes }`, and derives everything else:

- `design-system` defines its own structural `Hierarchy` type (it must not
  import `domain`); the domain trees satisfy it. Node resolution uses the same
  longest-matching-suffix convention as domain `resolvePathNode`, a deliberate
  ~10-line reimplementation.
- Children of a path are the resolved node's `choices` composed onto the path;
  level 0 offers `roots`. This replaces `buildHierarchyTree` and the `choices`
  prop.
- A path is a valid stop when it is a leaf or its node has `optional !== false`.
  This replaces `canStopAt`, and is exported as `canStopAtPath` so a
  consistency spec can call it.
- `getLabel` stays injected: the tree carries stable codes, labels resolve per
  app (i18n rule).

Domain-side, each vocabulary exports its bundle
(`MATERIAL_HIERARCHY`, `SAMPLE_TYPE_HIERARCHY`, `COLLECTION_METHOD_HIERARCHY`),
`core` is marked `optional: false` (the only non-leaf sample type), and
`isSampleTypeComplete` unifies on the same tree read as `isMaterialComplete`.
The stop policy is thus expressed once per source of truth. No cycle detection
in the widget: domain `expandPaths` still runs at import and throws on cycles.

An admin spec (`hierarchy-stop-consistency.spec.ts`) asserts that
`canStopAtPath` equals the domain completeness verdict for every path of every
vocabulary, closing the drift hazard between the UI and the publish gate.

## Consequences

- Callers pass `hierarchy` + `getLabel`; they cannot express a stop policy that
  contradicts the tree.
- A new vocabulary needs only its tree and label map; the widget needs no
  per-vocabulary wiring.
- The `T extends string` generic is gone: paths are runtime-derived strings and
  the domain path types are `string` aliases.
- The suffix-resolution convention now lives in two places (domain and
  design-system) by design; the consistency spec pins them together.
