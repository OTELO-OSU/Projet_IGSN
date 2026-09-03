---
type: domain-model
title: Post-publish field mutability
description: >-
  A published sample is partially mutable: lock maps in published-field-lock.ts
  name every frozen field, everything unlisted is editable, and the merge is the
  enforcement.
resource: packages/domain/src/sample/publication/published-field-lock.ts
tags:
  - domain
  - sample
  - publication
  - forms
relations:
  - type: depends_on
    target: material-levels-editable
  - type: depends_on
    target: form-kit-and-hidden-values
  - type: depends_on
    target: publish-blockers
status: stable
---

A sample with a permanent IGSN (`status <> 'draft'`) is partially mutable: the citable identity is frozen, everything else keeps improving.

- The rule lives in the lock maps at the top of `domain/sample/publication/published-field-lock.ts`, nowhere else. Each entry is one frozen field: the key is what `mergePublishedEdit` takes from storage, the value the admin form field names that edit it (several when the form splits one field, as a position into six coordinates).
- Editable is the default, so freezing a field is one entry and no parallel classification record exists. A new `CreateSample` field is editable until someone lists it.
- Enforcement is merge-not-reject: `PUT /:id` overlays only editable paths onto the stored sample, so a payload touching a frozen field is silently dropped. That merge is the mass-assignment guard; disabled inputs are UX only. `freezeLocked` runs last on the fully merged candidate, so a lock-map entry always wins.
- Conditional locks are hand-written, a leaf whose lock depends on a frozen sibling not being expressible as an entry: `texture` and `metamorphicFacies` are taken only from a payload agreeing on the frozen material, `position.vertical` is editable inside a frozen position, `navigationType` only while that position exists, the whole location drops when the frozen material forbids one, and the scientific context's frozen discriminant keeps the stored branch whole. An editable leaf whose frozen sibling is absent merges to null rather than adopting a meaningless value.
- `material` is the one field with no entry, its frozen levels deriving from the stored path; see [[material-levels-editable]].
- `repository.*` (archive and contacts) carries no entry, so all five fields stay editable after publication, as do the five late-recorded `syntheticDetails` fields ([[synthetic-details]]).
- A super admin bypasses every lock: `domain/user/can-edit-frozen-sample-fields.ts` is read by both the api's `mergePublishedEdit` call and the admin resolver. The IGSN is the exception, staying out of `createSampleSchema`.
- The admin form never restates the rule: `publishedSampleFrozenField` (`admin/src/samples/published-sample-frozen-field.ts`) consumes the flattened `FROZEN_FORM_FIELDS` / `FROZEN_FORM_FIELDS_BY_PROVENANCE`, adding only hierarchy-level suffix stripping and the frozen material depth, and `SampleForm` feeds it to the kit's `FieldDisabledProvider`. Freezing a control is listing its field name, never a published flag of its own.
