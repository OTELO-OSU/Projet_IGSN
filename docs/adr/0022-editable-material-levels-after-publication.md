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
`frozenWhenPublished?: boolean` flag on the node itself: when true, that
node's own value can no longer change once published; absent (the default)
means editable. The flag is fail-open, so every level that must stay frozen,
roots included, needs the mark explicitly. `material` leaves the lock maps of
`published-field-lock.ts` and gains a merge helper, since which levels lock
depends on the stored path.

`frozenMaterialPrefix` walks a stored path and returns its contiguous frozen
head, the prefix a published sample must keep (`null` means the whole path is
frozen with nothing left to refine). A path frozen all the way to a leaf whose
children are editable is still returned as its own prefix, so it can be
completed rather than stuck incomplete. `mergeMaterial` accepts an incoming
path only at-or-under that prefix; anything else keeps the stored value. The
admin form freezes the matching cascade levels through the same prefix via
`publishedSampleFrozenField`, so the form-level resolver stays the only place
that decides a control is frozen (ADR 0021).

A spec (`frozen-material-prefix.spec.ts`) guards the invariants the walk
depends on: the frozen nodes of every path form a contiguous head (no
editable level sits above a frozen one), every root is frozen, and a
fully-frozen path's children are uniformly frozen or uniformly editable
(never a mix of both).

**Rejected: an allowlist of full dot-paths.** A second list to keep in sync
with the tree, silently diverging the moment a node is added, moved, or
reused under another parent.

## Consequences

- Editability follows the node everywhere it appears; a dotted context
  override (`"hydrothermal.carbonate"` vs. bare `carbonate`) still shields a
  node that must stay frozen in one branch only.
- No versioning and no user-visible trace of a refinement (per ADR 0021).
  The IGSN and frozen prefix never change, so citations still resolve.
- ADR 0021's blocker-delta guard already rejects a refinement that introduces
  a new publish blocker with a 409.
- The flag is fail-open: a node with no mark is editable after publication.
  The guard spec catches a frozen level appearing below an editable one and
  an unfrozen root, but not a forgotten mark on a new frozen leaf whose
  ancestors are already frozen and uniform: that leaf still satisfies every
  invariant on its own and silently unlocks after publish. Review is the
  backstop for that case.
