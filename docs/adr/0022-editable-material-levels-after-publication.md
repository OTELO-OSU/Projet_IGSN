# 0022. Editable material levels after publication

Date: 2026-07-30

## Status

Accepted. Supersedes in part ADR
[0021](0021-post-publish-field-mutability.md), which declared `material`
always frozen.

## Context

The coarse classification is the citable identity and must not move after
publication, but its deeper refinement keeps improving, sometimes for years.
The unlock depth varies by branch (sediment at level 2, sedimentary rock at
3, igneous rock at 4), so a single depth cut cannot express it.

## Decision

Editability is declared per node, not per field. `TreeNode` gains a
`frozenWhenPublished?: false` flag on the node itself: absent (the default)
means frozen once published; only an explicit `false` opens that node's own
value to change. Only the first editable level under a frozen head carries
the mark, every level below it is never consulted, so the flag marks the
editable frontier, not every editable node. `material` leaves the lock maps
of `published-field-lock.ts` and gains a merge helper, since which levels
lock depends on the stored path.

`frozenMaterialPrefix` walks a stored path and returns its frozen head, the
prefix a published sample must keep (`null` means the whole path is frozen
with nothing left to refine). A path frozen all the way to a leaf whose
children are editable is still returned as its own prefix, so it can be
completed rather than stuck incomplete. `mergeMaterial` accepts an incoming
path only at-or-under that prefix; anything else keeps the stored value. The
admin form freezes the matching cascade levels through the same prefix via
`publishedSampleFrozenField`, so the form-level resolver stays the only place
that decides a control is frozen (ADR 0021).

In `mergePublishedEdit`, `freezeLocked` runs last, on the fully merged
candidate: a lock-map entry always wins over any per-field merge before it,
so no field may be reassigned after that call.

A spec (`frozen-material-prefix.spec.ts`) guards two invariants. No root is
editable: `frozenWhenPublished: false` on a root would let a published
sample change what it is. And a wholly frozen path's children are uniformly
frozen or uniformly editable, never a mix: a mixed set means one child was
marked and a sibling forgotten. Contiguity of the frozen head is not a
guarded invariant; the fail-closed default makes it hold by construction,
since a level is frozen unless its own mark says otherwise.

**Rejected: an allowlist of full dot-paths.** A second list to keep in sync
with the tree, silently diverging the moment a node is added, moved, or
reused under another parent.

**Rejected: an `unlocksBelow`/`editableChildren` flag on the frontier
parent.** One mark per frontier parent instead of one per frontier child
would shrink the tree diff. Rejected by user decision: the ~100 per-child
marks stay honest only because of `frozen-material-prefix.spec.ts`'s "gives a
wholly frozen path uniformly frozen or uniformly editable children" test,
which depends on every child of a wholly frozen node carrying its own mark
and fails loudly if a vocabulary addition below a frontier ships without one.
A flag that unlocks a whole child set from the parent hides that same
mistake instead, since nothing forces the child list to be revisited as it
grows. The extra per-child marks cost lines, not safety.

## Consequences

- Editability follows the node everywhere it appears; a dotted context
  override (`"hydrothermal.carbonate"` vs. bare `carbonate`) still shields a
  node that must stay frozen in one branch only.
- No versioning and no user-visible trace of a refinement (per ADR 0021).
  The IGSN and frozen prefix never change, so citations still resolve.
- ADR 0021's blocker-delta guard already rejects a refinement that introduces
  a new publish blocker with a 409.
- The flag is fail-closed: a forgotten mark over-locks rather than silently
  unlocking. A researcher who expects a level to open and finds it still
  frozen notices and reports it, so the mistake surfaces instead of hiding.
  The residual risk runs the other way: an accidental explicit `false` on a
  level that must stay frozen. The no-root-editable guard catches it on a
  root; the uniform-children guard catches it on any other level whose
  siblings in a wholly frozen path are still frozen; and the `it.each`
  fixture tables pin the frozen prefix of representative paths in every
  subtree, so a wrong mark on a covered level fails a named row. Review is
  the backstop for the
  one case none of those catches: a new editable mark placed under a branch
  whose siblings are also newly, and wrongly, marked editable in the same
  change.
