---
type: component
title: HierarchyField takes the tree as one prop
description: >-
  The widget receives a self-describing hierarchy prop and derives children,
  stop policy and labels, so the UI cannot contradict the domain publish gate.
resource: packages/design-system/src/components/form/hierarchy-field.tsx
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

`HierarchyField` takes the tree itself as one self-describing `hierarchy` prop, `{ roots, nodes }`, and derives everything else, so a caller cannot express a stop policy or a label contradicting the tree.

- `design-system` defines its own structural `Hierarchy` type, since it must not import `domain`, and the domain trees satisfy it. Node resolution repeats domain `resolvePathNode`'s longest-matching-suffix convention, a deliberate ~10-line reimplementation living in two places by design.
- Children of a path are the resolved node's `choices` composed onto the path; level 0 offers `roots`.
- A path is a valid stop when it is a leaf or its node is `optional: true`, mandatory by default, exported as `canStopAtPath`.
- No `getLabel`: each node's `label` carries its code, rendered through a `translate` prop (`(code) => string`), so translation stays app-side ([[i18n-strategy]]).
- `admin/src/samples/hierarchy-stop-consistency.spec.ts` asserts `canStopAtPath` equals the domain completeness verdict for every path of every vocabulary, closing the drift hazard between the UI and the publish gate.
- The widget needs no cycle detection, domain `expandPaths` throwing at import.
- A new vocabulary needs only its tree and label map, with no per-vocabulary wiring in the widget.

## One control for the whole path, not one combobox per level

The old per-level cascade (`HierarchySelectField`, one combobox rendered per selected level) is replaced by `HierarchyField`: one control for the whole path.

- One Badge chip per selected level, translated label, `>` separators, plus a completeness hint after the last chip: `> ...` when the path must still be refined to publish, `(> ...)` when it is complete but a deeper level may still be picked, nothing at a leaf. The `>` and `(> )` symbols are `aria-hidden`, with sr-only text carrying the admin i18n keys `hierarchy_must_refine` / `hierarchy_can_refine`.
- One popover lists only the current level's children, filtered by search on that level; it stays open while drilling down and closes at a leaf, on Escape, or by picking "Stop here", the first item offered in append mode (never shown when re-editing an existing chip, since stopping there is already the current value).
- Clicking a chip re-opens the popover on that level (its siblings, current one checked) and dims every deeper chip; picking a replacement drops those deeper chips, picking the same node again keeps the path whole.
- The remove button on a chip truncates the path at that level.
- Publication lock is per level, not per field: the control asks the form-level `FieldDisabledProvider` predicate with `name[depth]` names (`useFieldDisabledRule()` in `field-disabled-context.tsx`), so `publishedSampleFrozenField` needs no change for this widget. A frozen level renders as a plain-text chip with no remove button; the trigger itself is disabled at a leaf or when the next level to append is frozen.
- A draft validation error lands on the array field itself (e.g. `materialPath`), never on an indexed `materialPath[n]`.
- The per-level required marker (`"Rock *"`) is gone: only the root `*` and the hint communicate the requirement.
- The value model is unchanged: `xxxPath: string[]` cumulative prefixes, `composeHierarchyValue`, `toHierarchyPath`.

The pure helpers (`Hierarchy`, `hierarchyChildren`, `canStopAtPath`, `hierarchyPathLabel`, `hierarchyLevelItems`, `composeHierarchyValue`, `toHierarchyPath`) live in `packages/design-system/src/lib/hierarchy.ts`, imported by `HierarchyField`, by the public frontend search facet, by the admin collection-method filter and by the admin draft schema. The per-level widget is deleted.

`HierarchyField` (`form/hierarchy-field.tsx`) is a thin tanstack binding, the same shape as `Combobox` / `ComboboxField`, over the unbound primitive `ui/hierarchy-input.tsx` (`HierarchyInput`): `value: string[]` cumulative prefixes, `onChange`, `isSelectable` to restrict the offered children, `isLevelLocked`, an optional `hint`. The public frontend search facets for type, material and collection method (`frontend/src/domain/samples/facet-hierarchy.tsx`) render `Label` + `HierarchyInput` directly, with no form: they bridge the dot-path URL value through `toHierarchyPath` / `composeHierarchyValue`, offer only `searchable` nodes via `isSelectable={isPathSearchable}`, and render no completeness hint, since any searchable node is a legitimate filter stop (the filter matches at-or-under). Removing the root chip clears the facet.
