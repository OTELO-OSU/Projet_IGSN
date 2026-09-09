---
type: domain-model
title: Sample model
description: >-
  One wide sample row with flat nullable sub-blocks, two one-to-many child
  tables, and snapshotted institutional codes.
resource: packages/domain/src/sample
tags:
  - domain
  - sample
  - persistence
relations:
  - type: depends_on
    target: sample-status-lifecycle
  - type: depends_on
    target: material-classification-ltree
  - type: depends_on
    target: sample-location
  - type: depends_on
    target: sample-relations-attachments
  - type: depends_on
    target: synthetic-details
  - type: depends_on
    target: kysely-dbal
  - type: depends_on
    target: sample-parentage
status: stable
---

`Sample` is one type over one wide `sample` row; sub-data 1:1 with the sample lives as flat nullable columns, except the location, which is a shared table a sample points at (`sample.location_id`), see [[sample-location]].

- Ids are app-generated UUIDv7, which also seeds the minted IGSN ([[igsn-identifier]]).
- Sub-blocks: identity (name, specific name, nature, type), [[material-classification-ltree]], [[sample-location]] (`location: Location | null`), physical description, condition, scientific context, provenance, repository (archive plus two admin-only contacts), [[synthetic-details]] for a synthetic material.
- One-to-many children have their own tables: `sample_relation` and `sample_attachment`, see [[sample-relations-attachments]]; `sample_parent` links a sample to its at-most-one parent, see [[sample-parentage]].
- `manualGroups` (id plus name) come from the `sample_manual_group` join table, `createSampleSchema` carrying `manualGroupIds`; see [[manual-groups]].
- Three institutional codes (`institutional_organization`, `institutional_osu`, `institutional_laboratory`) are snapshotted at creation from the owner and never updated; they stay out of `createSampleSchema`. See [[institutional-groups]].
- Ownership and collaborators live in `user_sample`; see [[per-sample-roles]].
- Lifecycle is `status` ([[sample-status-lifecycle]]), mutability after publication [[published-field-locks]].
- Every sample read (get, list, publish) hydrates children with two batched queries, so there is no N+1 at list scale.
