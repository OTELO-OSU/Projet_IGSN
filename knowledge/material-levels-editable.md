---
type: domain-model
title: Editable material levels after publication
description: >-
  Niveau 1 is a single frontier carrying both TreeNode.optional and
  frozenWhenPublished; frozenMaterialPrefix derives the prefix a published
  sample must keep.
resource: packages/domain/src/sample/material/frozen-material-prefix.ts
tags:
  - domain
  - sample
  - publication
  - vocabulary
relations:
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: material-classification-ltree
status: stable
---

The coarse material classification (niveau 0, the root) is the citable identity and never moves after publication. Niveau 1 is required to publish and stays editable after publication; niveau 2 and deeper are optional and editable. Both the publish depth and the unlock depth are the same frontier, so one frontier mark does both jobs (ADR 0037).

- The 14 niveau-1 nodes (the 7 children of `rock`, the 4 of `sediment`, the 3 of `extraterrestrial_rock`) each carry `{ optional: true, frozenWhenPublished: false }`. `mineral` and `synthetic_rock_mineral` carry neither: they have no sub-level, so they are already complete and wholly frozen.
- `TreeNode.frozenWhenPublished?: false`: absent means frozen once published, and only an explicit `false` opens that node's own value. `TreeNode.optional?: true` behaves the same way now: a mark opens its whole subtree as a valid stopping point, not just the marked node ([[vocabulary-tree]]).
- `frozenMaterialPrefix` walks a stored path and returns its frozen head, the prefix a published sample must keep (`null` meaning the whole path is frozen). With the niveau-1 frontier this is always the root (`rock`, `sediment`, `extraterrestrial_rock`) or `null` for a root leaf.
- `mergeMaterial` accepts an incoming path only at or under that prefix; anything else keeps the stored value. The admin form freezes the matching cascade levels through the same prefix via `publishedSampleFrozenField`, so the form-level resolver stays the only place deciding a control is frozen ([[published-field-locks]]).
- The flag is fail-closed: a forgotten mark over-locks rather than silently unlocking.
- `frozen-material-prefix.spec.ts` guards two invariants (no root is editable; a wholly frozen path's children are uniformly frozen or uniformly editable) plus a third proving the `optional` and `frozenWhenPublished` frontiers coincide, the drift guard for "niveau 1 is both the stop depth and the unlock depth".
- Editability follows the node everywhere it appears, and a dotted context override (`"hydrothermal.carbonate"` vs bare `carbonate`) shields a node frozen in one branch only.
- A refinement that introduces a new publish blocker is still rejected 409 ([[publish-blockers]]).
