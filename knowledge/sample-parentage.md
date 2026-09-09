---
type: domain-model
title: Sample parentage and sub-samples
description: >-
  A sample may have one parent, set at creation and never editable; it inherits
  the parent's location and, for a synthetic parent, its material branch.
resource: packages/domain/src/sample/parent
tags:
  - domain
  - sample
  - parentage
relations:
  - type: depends_on
    target: sample-model
  - type: depends_on
    target: sample-location
  - type: depends_on
    target: sample-status-lifecycle
  - type: depends_on
    target: sample-relations-attachments
status: stable
---

A sample may have one parent, the sample it was sub-sampled from (broken, powdered, cut into a thin section...). Stored as a many-to-many `sample_parent` table (`sample_id`, `parent_id`, both cascade FKs, a composite PK, a check that a sample is never its own parent) because a second parent is a future extension; the write schema caps `parentIds` at `.max(1)` today.

- **Set at creation, never editable.** `parentIds` is accepted only by `createSampleSchema`; `updateSampleBodySchema` omits it entirely, so a parent in an update body is a 400. `insertSampleParents` runs from `insertSample` only, never from `updateSample`.
- **Who may declare a sub-sample of what is one domain predicate**, `canDeclareSubSample(sample, { role, managed })`: a `draft` never; a `published` sample, anyone, same as reading it on the front; a `withdrawn` sample, only a caller with a role on it or moderation reach; a `tombstone`, only moderation reach (covers a super admin). `find-eligible-parent.ts` (`findEligibleParent`) is the single eligibility read, shared by the creation-time `PARENT_NOT_ELIGIBLE` 422 in `admin-routes.ts` and `GET /admin/samples/parents/:id`; not a publish blocker, a sample with an ineligible parent is simply never created.
- **The public sample page offers "Add a sub sample" beside Edit**, to any signed-in visitor on a published sample, linking to `${ADMIN_URL}/samples/create?parent=<id>`. Not shown on the withdrawn view.
- **The admin create form prefills from that parent id** through `GET /admin/samples/parents/:id`, one 404 for every refusal (ineligible, tombstoned out of reach, unknown id), the sample whole since the archive contacts are hidden on the public site only; a 404 falls back to the plain create form.
- **The parent's owner becomes a `contributor` on the new sub-sample**, silently, inside the creation transaction (`add-parent-owner-as-contributor.ts`); the creator stays sole owner if they already own the parent. See ADR 0024's amendment.
- **Location is inherited, not copied.** A child points its own `sample.location_id` at the parent's `location` row when `allowsLocation(parent.material)`, so a later edit to the parent's location reaches every descendant with no propagation step. The location a child's own create payload carries is ignored once it has a parent. See [[sample-location]] and ADR 0014's fourth amendment for the storage shape.
- **Material freeze is the only material rule.** A child of a synthetic parent (`isSyntheticMaterial(parent.material)`) stays in the synthetic branch: the admin form freezes every material level, unlike publication, which only freezes the stored prefix. A child of a natural parent picks its material freely.
- **No collections copied.** A sub-sample starts from the parent's fields but with no name, no nature, no IGSN, no grandparent, and no relations, attachments or manual groups: `admin/src/samples/to-sub-sample-defaults.ts` clears them, `relations: []`, `attachments: []`, `manualGroupIds: []`.
- **A parent's status change never affects its children.** It can only make the parent inaccessible (e.g. tombstoned): existing children keep their own status and their inherited location row untouched.
- **The public page names the parent whatever its status.** A published sub-sample's page links to its parent's IGSN page unconditionally; if the parent is tombstoned that link 404s and the parent's `name`, `igsn` and `material` stay visible through the child. See ADR 0033's sub-sample exception.

## `sample_relation` overlap

`sample_relation` already offers `is_derived_from` and an `igsn` identifier type, so it can describe a parent/child relationship in free text. It cannot replace parentage: its `identifier` is unchecked text, so it cannot enforce that the target exists, is eligible, or that there is at most one. Parentage (`sample_parent`) is the source of truth for a sub-sample; the relation list stays for lineage recorded against samples in other registries, which parentage cannot reach. See [[sample-relations-attachments]].
