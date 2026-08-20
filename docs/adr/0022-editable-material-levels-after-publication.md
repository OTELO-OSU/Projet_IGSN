# 0022. Editable material levels after publication

Date: 2026-07-30

## Status

Accepted. Supersedes in part ADR 0021, which declared `material` always frozen.

## Context

The coarse classification is the citable identity and must not move after publication, but its deeper refinement keeps improving, sometimes for years. The unlock depth varies by branch (sediment at level 2, sedimentary rock at 3, igneous rock at 4), so a single depth cut cannot express it.

## Decision

Editability is declared per node, not per field. `TreeNode` gains a `frozenWhenPublished?: false` flag on the node itself: absent, the default, means frozen once published, and only an explicit `false` opens that node's own value to change. Only the first editable level under a frozen head carries the mark, every level below it never being consulted, so the flag marks the editable frontier rather than every editable node. `material` therefore leaves the lock maps of `published-field-lock.ts` and gains a merge helper, since which levels lock depends on the stored path.

`frozenMaterialPrefix` walks a stored path and returns its frozen head, the prefix a published sample must keep (`null` meaning the whole path is frozen with nothing left to refine). A path frozen all the way to a leaf whose children are editable is returned as its own prefix, so it can be completed rather than stuck incomplete. `mergeMaterial` accepts an incoming path only at or under that prefix, anything else keeping the stored value, and the admin form freezes the matching cascade levels through the same prefix via `publishedSampleFrozenField`, so the form-level resolver stays the only place deciding a control is frozen (ADR 0021).

In `mergePublishedEdit`, `freezeLocked` runs last, on the fully merged candidate, so a lock-map entry always wins over any per-field merge before it and no field may be reassigned after that call.

`frozen-material-prefix.spec.ts` guards two invariants: no root is editable, since marking one would let a published sample change what it is; and a wholly frozen path's children are uniformly frozen or uniformly editable, never a mix, a mixed set meaning one child was marked and a sibling forgotten. Contiguity of the frozen head is not guarded, the fail-closed default making it hold by construction.

**Rejected: an allowlist of full dot-paths.** A second list to keep in sync with the tree, silently diverging the moment a node is added, moved, or reused under another parent.

**Rejected: an `unlocksBelow` flag on the frontier parent.** One mark per frontier parent instead of one per frontier child would shrink the tree diff, but the uniform-children test only stays honest because every child of a wholly frozen node carries its own mark, so it fails loudly when a vocabulary addition below a frontier ships without one. A parent flag hides that same mistake, since nothing forces the child list to be revisited as it grows. The extra per-child marks cost lines, not safety. Explicit user decision.

## Consequences

- Editability follows the node everywhere it appears, and a dotted context override (`"hydrothermal.carbonate"` vs. bare `carbonate`) still shields a node that must stay frozen in one branch only.
- No versioning and no user-visible trace of a refinement (per ADR 0021). The IGSN and frozen prefix never change, so citations still resolve.
- ADR 0021's blocker-delta guard already rejects with a 409 a refinement that introduces a new publish blocker.
- The flag is fail-closed, so a forgotten mark over-locks rather than silently unlocking, and a researcher who finds a level still frozen reports it. The residual risk runs the other way, an accidental explicit `false` on a level that must stay frozen: the two invariants catch it on a root and on any level whose siblings are still frozen, and the fixture tables pin the frozen prefix of representative paths in every subtree. Review is the backstop for the one case none of those catches, a new editable mark under a branch whose siblings are wrongly marked editable in the same change.
