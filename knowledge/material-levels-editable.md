---
type: domain-model
title: Editable material levels after publication
description: >-
  TreeNode.frozenWhenPublished marks the editable frontier per node;
  frozenMaterialPrefix derives the prefix a published sample must keep.
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

The coarse material classification is the citable identity and never moves after publication, but its deeper refinement keeps improving, and the unlock depth varies by branch (sediment at level 2, sedimentary rock at 3, igneous rock at 4). So editability is declared per node, not per field.

- `TreeNode.frozenWhenPublished?: false`: absent means frozen once published, and only an explicit `false` opens that node's own value. Only the first editable level under a frozen head carries the mark, so the flag marks the editable frontier.
- `frozenMaterialPrefix` walks a stored path and returns its frozen head, the prefix a published sample must keep (`null` meaning the whole path is frozen). A path frozen to a leaf whose children are editable is returned as its own prefix, so it can still be completed.
- `mergeMaterial` accepts an incoming path only at or under that prefix; anything else keeps the stored value. The admin form freezes the matching cascade levels through the same prefix via `publishedSampleFrozenField`, so the form-level resolver stays the only place deciding a control is frozen ([[published-field-locks]]).
- The flag is fail-closed: a forgotten mark over-locks rather than silently unlocking.
- `frozen-material-prefix.spec.ts` guards two invariants: no root is editable, and a wholly frozen path's children are uniformly frozen or uniformly editable, never a mix.
- Editability follows the node everywhere it appears, and a dotted context override (`"hydrothermal.carbonate"` vs bare `carbonate`) shields a node frozen in one branch only.
- A refinement that introduces a new publish blocker is still rejected 409 ([[publish-blockers]]).
