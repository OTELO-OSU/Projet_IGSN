---
type: domain-model
title: "Scientific context: field sample or collection specimen"
description: >-
  A discriminated union on provenanceStatus (field_sample | collection_specimen)
  with per-branch mandatory fields, per-branch post-publish locks, and a
  location requirement that only the collection specimen relaxes.
resource: packages/domain/src/sample/scientific-context
tags:
  - domain
  - sample
  - publication
  - forms
relations:
  - type: depends_on
    target: publish-blockers
  - type: depends_on
    target: published-field-locks
  - type: depends_on
    target: form-kit-and-hidden-values
  - type: depends_on
    target: search-facets
status: stable
---

`scientificContextSchema` (`domain/sample/scientific-context/model.ts`) is a Zod discriminated union on `provenanceStatus`, stored as flat `sc_*` columns on `sample` and rebuilt off `sc_provenance_status` in `api/.../to-sample.ts`.

Codes and labels (renamed 2026-09-04, data migration `20260904074005-rename-provenance-status-codes.ts`, reversible):

- `field_sample`, label "Field sample" (was `recent_collection` / "Field collection").
- `collection_specimen`, label "Collection specimen" (was `historical_specimen` / "Historical collection").
- The code is a public contract: it appears as-is in `GET /samples/:igsn`. Labels live in `domain/messages` under `provenance_status_<code>`.

Field sample branch:

- The three person fields (`chiefScientist`, `collector`, `operator` on synthetic details) are each split into a `*Firstname`/`*Lastname` pair, indexed with a trigram index per column; see [[search-facets]].
- Field order in the form: collector, chief scientist, host institution, additional roles, funder organizations, funding, research programme name, research programme description, platform type, launch platform name.
- Each person is EITHER a link to a registry account (`*UserId`) OR a typed name, never both: `domain/sample/contact-link.ts` holds that exclusivity, enforced on the write schemas and by a Postgres CHECK per person. No person ORCID is ever typed: the write schema strips a submitted `*Orcid` silently, and the read model resolves it live from the linked account alone, not snapshotted, so renaming or re-linking an account changes a published sample's display and its public payload; accepted, see ADR 0032 and ADR [0049](../docs/adr/0049-person-orcid-from-linked-account-only.md). A link is not a collaborator role and grants no `user_sample` row or contributor facet; deleting a linked account is refused at the database (`on delete restrict`).
- Mandatory to publish ([[publish-blockers]]): `funderOrganizations` (multi ROR), `hostInstitution` (multi ROR), a collector (a link, or the `collectorFirstname` + `collectorLastname` pair). `researchProgramName` carries no publish blocker and no required marker despite the label. `chiefScientistFirstname`/`chiefScientistLastname` are not mandatory, but publishing blocks on the empty half once the other is filled (`chief_scientist_firstname_missing` / `chief_scientist_lastname_missing`); a link always satisfies these blockers, whatever the account holds.
- Optional: `chiefScientistFirstname`, `chiefScientistLastname` (or `chiefScientistUserId`), `funding`, `researchProgramDescription`, `platformType` (15-code vocabulary), `launchPlatformName`.
- `additionalRoles[]`: a repeatable list of `{ role, personUserId | personFirstname/personLastname }`, `role` one of `researcher | project_manager | project_member | data_manager`, persisted in `sample_additional_role`, field sample only. Each row follows the same link-or-typed-name exclusivity as the other person fields. A row with neither a link nor a typed name blocks publication (`additional_role_firstname_missing` / `additional_role_lastname_missing`); its legend carries the trailing `*` while that holds. Editable after publication: no entry in `published-field-lock.ts` freezes it. No public search facet. See ADR [0046](../docs/adr/0046-additional-scientific-roles.md).
- Frozen after publication ([[published-field-locks]], `LOCKED_FIELD_SAMPLE_FIELDS_TO_FORM_FIELDS`): the collector as one unit, `collectorUserId`, `collectorFirstname` and `collectorLastname`. The merge keeps the link and nulls the two typed fields when `collectorUserId` is stored, or keeps the stored name when it is not, never both. There is no `collectorOrcid` to freeze or edit: it is read-only, resolved from the link. The chief scientist and the new `platformType`/`launchPlatformName` stay editable.
- Public search facets ([[search-facets]]): `researchProgramName`, `chiefScientist`, `hostInstitution`, `collectorName`. The three person facets match a full name token by token against both the firstname and lastname columns, or against a linked account's own columns. Funder organizations have none.

Collection specimen branch:

- Field order in the form: collection origin, collector, context description.
- Mandatory: `collectionOrigin` (enum `scientific_expedition | purchase | constitution | inheritance | unknown_origin`).
- Optional: a collector (link or typed name), `collectionContextDescription`; publishing blocks on the empty typed half once the other is filled (`collector_firstname_missing` / `collector_lastname_missing`).
- Frozen after publication: `collectionOrigin` alone (`LOCKED_COLLECTION_SPECIMEN_FIELDS_TO_FORM_FIELDS`).
- A collection specimen publishes without a location: `requiresLocation(provenanceStatus)` is false for it alone ([[location-material-gate]]).

Shared rules:

- `provenanceStatus` itself is mandatory (`scientific_context_missing`) and frozen after publication; `mergeScientificContext` returns the stored branch whole when a payload disagrees on the discriminant.
- `collectorFirstname`/`collectorLastname`/`collectorUserId` are the one triple on both branches, `sc_collector_firstname`/`sc_collector_lastname`/`sc_collector_user_id` columns; mandatory and frozen (as one unit) on a field sample, optional and editable on a collection specimen.
- Switching the status in the admin form drops the other branch's values outright (owner's call, a deviation from [[form-kit-and-hidden-values]] keep-and-restore); the compose step emits the active branch only.
- Organization names are reference data from `ORGANIZATIONS`, not i18n.
- IGSN Core has no slot for a registry account, so a `/service` POST always lands a person as typed text, and never as ORCID: an incoming ORCID is silently stripped like a typed one; see ADR 0048 and ADR 0049.
