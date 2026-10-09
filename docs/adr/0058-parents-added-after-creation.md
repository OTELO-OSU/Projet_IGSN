# 0058. Parents added after creation

Date: 2026-10-08

## Status

Accepted.

Amends ADR [0039](0039-two-parent-sub-samples.md) (parents were write-once), ADR [0043](0043-public-lineage-visibility.md) (a cycle was unreachable), ADR [0044](0044-process-steps-on-sub-samples.md) (`updateSampleSchema` now carries `parentIds`) and ADR [0053](0053-ancestor-location-inheritance.md) (inheritance was creation-only).

## Context

A researcher sometimes realises only after creating, or publishing, a sample that it is a sub-sample of another one. Parents were write-once: `updateSampleSchema` omitted `parentIds`, `/service` PUT answered 403 `field_frozen` for any parent change, and the admin edit form showed parents read-only.

Three rules leaned on that immutability: the lineage walk ran an uncapped `union` because no cycle could appear, location inheritance ran at insert only, and DataCite carried the parent link on the child's record alone.

## Decision

- A parentless sample may gain exactly one parent after creation. A one-parent sample never gains a second, so a two-parent sample stays creation-only (ADR 0039). A stored parent is never removed or replaced, a super admin included, so no lock-map entry exists: the api refuses a removal or a second parent (422) instead of merging it.
- One write path serves every surface: the PUT body carries `parentIds`, `addSampleParents` (`api/src/sample/service/add-sample-parents.ts`) diffs it against the stored rows inside the update transaction, and the admin PUT, `/service` PUT and the Excel bulk edit all reach it. `/service` resolves a new `IsDerivedFrom` relation by IGSN and still answers `field_frozen` for a missing stored one. The bulk edit's Parent IGSN cell is frozen only on a row that already has a parent, so it covers 0→1 (a two-parent sample is synthetic, which bulk edit refuses).
- The write refuses the sample itself and any of its descendants as a parent (422), the only guard keeping the lineage walk finite. Two concurrent writes closing a cycle are not serialised, a `ponytail:` marker naming the row lock as the upgrade.
- A sample gaining a sole parent inherits its location as at creation: its own pointer moves to the parent's row and its own row is deleted once orphaned. Two parents keep forcing a synthetic, location-less sample.
- The change cascades to followers: every descendant whose pointer still equals the sample's old one (null included), reached through sole-parent links, moves with it. A descendant that cleared its inherited location, or sits under a two-parent node, is untouched.
- The admin edit form always shows its Parent tab, which offers a parent picker on a parentless sample; the pick is a pending change sent by the form's Save, like any field. The parent picker excludes the sample and its descendants (`childId`).
- DataCite gets the mirror relation: a parent's DOI record lists each child holding an IGSN as `IsSourceOf`, read by `syncDoi` on every sync. DataCite only, the Core `/service` payload is unchanged.
- The parent's record gets a partial update, `PUT /dois/{parentDoi}` with only `relatedIdentifiers` and no `event`, which leaves its other metadata, url and state untouched, so a withdrawn, embargoed or tombstoned parent is covered too (DataCite: "only the attributes included in the payload will be affected"). The list is replaced whole, so the full one is sent.
- A direct write (admin PUT, `/service` PUT) adding a parent to a sample holding an IGSN sends it synchronously inside that write. A queued write (Excel bulk edit, `/service` batch) calls DataCite only from the publishing worker: publishing a child mirrors every one of its parents, first registration or re-publication alike, the PUT being idempotent, so a job makes one call per parent plus the child's own.
- A bulk edit or a batch checks its added parents against the lineage the file itself would create, not only the stored one (`api/src/sample/service/find-cyclic-parent-links.ts`), so two rows naming each other are refused as `parent_cycle` issues rather than a bare 422 from the write transaction.

## Rejected

- Adding a second parent later: a combination of two samples is a synthesis declared at creation, and its synthetic material is frozen on a published sample (ADR 0039).
- A dedicated "add parent" endpoint: a second write path to keep in step with the edit lock, the stale check and `/service`, where one body field does the job.
- Refusing a parent while the sample has its own location: one more step for the researcher, and the inherited row is the rule a sub-sample already lives by.
- A chosen location parent for two-parent samples: a synthesis has no location (ADR 0039).
- A database-level cycle constraint: a trigger walking the graph on every insert, for a race the single-editor rule already makes negligible.
- Emitting `IsSourceOf` in the Core payload too: no client asked, and a round trip would have to ignore it on input.
- Re-sending the parent through the publication queue (ADR [0052](0052-async-import-publication-via-publishing-status.md)): it set the parent back to `publishing`, hiding it from its public page, search and the lineage until the worker caught up.

## Consequences

- A published sample gaining a parent leaves the default public list (`includeSubSamples`, ADR 0045) and its collection date is re-derived on the same write.
- A refused parent update in a direct write answers 502 and rolls the write back whole, the ADR 0044 rule; in the worker it fails the child's publication into `publish_failed` like any refused DataCite call.
- Every publication of a two-parent synthetic sample, which only creation (admin, `/service`) can produce, makes three calls.
- `checkSample`'s two-parent rules now run on update too, on the stored set a client echoes back.
