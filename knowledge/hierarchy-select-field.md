---
type: component
title: HierarchySelectField takes the tree as one prop
description: >-
  The widget receives a self-describing hierarchy prop and derives children,
  stop policy and labels, so the UI cannot contradict the domain publish gate.
resource: packages/design-system/src/components/form/hierarchy-select-field.tsx
tags:
  - design-system
  - forms
  - vocabulary
relations:
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: form-kit-and-hidden-values
status: stable
---

`HierarchySelectField` takes the tree itself as one self-describing `hierarchy` prop, `{ roots, nodes }`, and derives everything else, so a caller cannot express a stop policy or a label contradicting the tree.

- `design-system` defines its own structural `Hierarchy` type, since it must not import `domain`, and the domain trees satisfy it. Node resolution repeats domain `resolvePathNode`'s longest-matching-suffix convention, a deliberate ~10-line reimplementation living in two places by design.
- Children of a path are the resolved node's `choices` composed onto the path; level 0 offers `roots`.
- A path is a valid stop when it is a leaf or its node is `optional: true`, mandatory by default, exported as `canStopAtPath`.
- No `getLabel`: each node's `label` carries its code, rendered through a `translate` prop (`(code) => string`), so translation stays app-side ([[i18n-strategy]]).
- `admin/src/samples/hierarchy-stop-consistency.spec.ts` asserts `canStopAtPath` equals the domain completeness verdict for every path of every vocabulary, closing the drift hazard between the UI and the publish gate.
- The widget needs no cycle detection, domain `expandPaths` throwing at import.
- A new vocabulary needs only its tree and label map, with no per-vocabulary wiring in the widget.
