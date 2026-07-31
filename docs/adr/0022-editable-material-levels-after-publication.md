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

Editability is declared per node, not per field. `TreeNode` gains an
`editableChildren?: boolean` flag: when set, that node's children may still
be chosen after publication. `material` leaves the lock maps of
`published-field-lock.ts` and gains a merge helper, since which levels lock
depends on the stored path.

`frozenMaterialPrefix` walks a stored path and returns the shallowest
ancestor carrying the flag, the prefix a published sample must keep (`null`
means fully frozen). `mergeMaterial` accepts an incoming path only at-or-under
that prefix; anything else keeps the stored value. The admin form freezes the
matching cascade levels through the same prefix via
`publishedSampleFrozenField`, so the form-level resolver stays the only place
that decides a control is frozen (ADR 0021).

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
- The nodes marked `editableChildren: true` are not pinned by a spec (cut as
  lockstep duplication with the tree); an accidental mark is caught by
  review only.
