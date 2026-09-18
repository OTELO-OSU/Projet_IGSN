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

- The four person fields (`chiefScientist`, `collector`, `collectionCurator`, `operator` on synthetic details) are each split into a `*Firstname`/`*Lastname` pair, indexed with a trigram index per column; see [[search-facets]].
- Mandatory to publish ([[publish-blockers]]): `funderOrganizations` (multi ROR), `researchProgramName`, `hostInstitution` (multi ROR), `collectorFirstname` + `collectorLastname`. `chiefScientistFirstname`/`chiefScientistLastname` are not mandatory, but publishing blocks on the empty half once the other is filled (`chief_scientist_firstname_missing` / `chief_scientist_lastname_missing`).
- Optional: `chiefScientistFirstname`, `chiefScientistLastname`, `chiefScientistOrcid`, `collectorOrcid`, `researchCampaign`, `funding`, `researchProgramDescription`, `fieldName`, `missionDescription`.
- Frozen after publication ([[published-field-locks]], `LOCKED_FIELD_SAMPLE_FIELDS_TO_FORM_FIELDS`): `collectorFirstname`, `collectorLastname` and `collectorOrcid`. The chief scientist's name and ORCID stay editable.
- Public search facets ([[search-facets]]): `researchProgramName`, `chiefScientist`, `hostInstitution`, `collectorName`. The three person facets match a full name token by token against both the firstname and lastname columns. Funder organizations have none.

Collection specimen branch:

- Mandatory: `collectionCuratorFirstname` + `collectionCuratorLastname`, `collectionOrigin` (enum `scientific_expedition | purchase | constitution | inheritance | unknown_origin`).
- Optional: `collectorFirstname`, `collectorLastname`, `collectionContextDescription`; publishing blocks on the empty half once the other is filled (`collector_firstname_missing` / `collector_lastname_missing`).
- Frozen after publication: `collectionCuratorFirstname`, `collectionCuratorLastname`, `collectionOrigin`.
- Facet: `collectionCurator`.
- A collection specimen publishes without a location: `requiresLocation(provenanceStatus)` is false for it alone ([[location-material-gate]]).

Shared rules:

- `provenanceStatus` itself is mandatory (`scientific_context_missing`) and frozen after publication; `mergeScientificContext` returns the stored branch whole when a payload disagrees on the discriminant.
- `collectorFirstname`/`collectorLastname` are the one pair on both branches, `sc_collector_firstname`/`sc_collector_lastname` columns; mandatory and frozen on a field sample, optional and editable on a collection specimen.
- Switching the status in the admin form drops the other branch's values outright (owner's call, a deviation from [[form-kit-and-hidden-values]] keep-and-restore); the compose step emits the active branch only.
- Organization names are reference data from `ORGANIZATIONS`, not i18n.
