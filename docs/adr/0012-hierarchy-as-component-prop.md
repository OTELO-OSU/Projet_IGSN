# 0012. Hierarchy tree as the HierarchySelectField prop

## Status

Accepted (builds on ADR 0011)

## Context

`HierarchySelectField` took three correlated props derived from one source: `choices` (the flat expanded paths), `canStopAt` (the stop policy) and `getLabel`. `canStopAt` was a free-form function a caller could pass in contradiction with the tree, letting the UI's "stop here" options drift from the domain completeness verdict that gates publishing.

## Decision

The widget receives the tree itself as one self-describing `hierarchy` prop, `{ roots, nodes }`, and derives the rest:

- `design-system` defines its own structural `Hierarchy` type, since it must not import `domain`, and the domain trees satisfy it. Node resolution repeats domain `resolvePathNode`'s longest-matching-suffix convention, a deliberate ~10-line reimplementation.
- Children of a path are the resolved node's `choices` composed onto the path, and level 0 offers `roots`, replacing `buildHierarchyTree` and the `choices` prop.
- A path is a valid stop when it is a leaf or its node is `optional: true`, mandatory by default, tightening ADR 0011's `optional !== false` reading. This replaces `canStopAt` and is exported as `canStopAtPath`.
- No `getLabel`: each node's `label` carries its code, rendered through a `translate` prop (`(code) => string`, defaulting to the raw code), so translation stays app-side per the i18n rule.

Domain-side, each vocabulary exports its bundle (`MATERIAL_HIERARCHY`, `SAMPLE_TYPE_HIERARCHY`, `COLLECTION_METHOD_HIERARCHY`), so the stop policy is stated once per source of truth: collection method marks its non-leaves `optional: true`, every node being a valid stop there, while material and type mark nothing, and `isSampleTypeComplete` unifies on the same tree read as `isMaterialComplete`. The widget needs no cycle detection, since domain `expandPaths` runs at import and throws.

`admin/src/samples/hierarchy-stop-consistency.spec.ts` asserts that `canStopAtPath` equals the domain completeness verdict for every path of every vocabulary, closing the drift hazard between the UI and the publish gate.

## Consequences

- Callers pass one translated `hierarchy` and cannot express a stop policy or a label that contradicts the tree.
- A new vocabulary needs only its tree and label map, with no per-vocabulary wiring in the widget.
- Paths are runtime-derived strings, so the `T extends string` generic is gone and the domain path types are `string` aliases.
- The suffix-resolution convention lives in two places by design, the consistency spec pinning them together.
