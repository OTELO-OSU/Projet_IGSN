---
type: project
title: IGSN registry
description: >-
  Registry assigning IGSN identifiers to geological samples, making them
  discoverable and reusable worldwide.
resource: CLAUDE.md
tags:
  - project
  - domain
  - index
relations:
  - type: depends_on
    target: package-layering
  - type: depends_on
    target: sample-model
  - type: depends_on
    target: igsn-identifier
  - type: depends_on
    target: personas-and-roles
  - type: depends_on
    target: auth-keycloak-gaiadata
  - type: depends_on
    target: dev-practices
  - type: depends_on
    target: preprod-infrastructure
  - type: depends_on
    target: sample-search
  - type: depends_on
    target: search-facets
  - type: depends_on
    target: map-search-leaflet
  - type: depends_on
    target: public-contributor-directory
  - type: depends_on
    target: frontend-url-i18n
  - type: depends_on
    target: frontend-conventions
  - type: depends_on
    target: hierarchy-select-field
  - type: depends_on
    target: sample-form-update-guide
  - type: depends_on
    target: api-trust-boundary-security
  - type: depends_on
    target: mail-notifications
  - type: depends_on
    target: legacy-import
  - type: depends_on
    target: orcid-linking
status: stable
---

A registry assigning unique IGSN identifiers (International Generic Sample Number) to geological samples, so a sample is citable, discoverable and reusable worldwide. Entry point of this knowledge graph: every other concept is reachable from here.

- In scope: future physical samples of the solid Earth, extraterrestrial ones included.
- Out of scope: other domains (fauna, flora, archaeology), past samples except the legacy dump.
- A sub-sample is a part of a sample transformed for analysis (broken, powdered, cut into thin sections), itself re-transformable, 1 to 3 levels typical and up to ~10. Part of the original is always preserved. The current schema has no sub-sample hierarchy.
- Target user: the tool-fatigued, change-averse researcher, so adoption must be easy.
- Two apps, a public `frontend` and an authenticated `admin`, over one `api`, sharing `domain` and `design-system`.

Map of the graph:

- Structure: [[package-layering]], [[file-layout-conventions]], [[zod-single-source-of-truth]], [[dev-practices]], [[commands-and-services]], [[testing-strategy]].
- Sample: [[sample-model]], [[igsn-identifier]], [[sample-status-lifecycle]], [[publish-blockers]], [[published-field-locks]], [[material-levels-editable]], [[sample-location]], [[location-material-gate]], [[sample-links-attachments]], [[vocabulary-tree]], [[material-classification-ltree]].
- People and rights: [[personas-and-roles]], [[auth-keycloak-gaiadata]], [[gaiadata-sso-compliance]], [[user-store-and-ownership]], [[per-sample-roles]], [[user-moderation-super-admin]], [[space-manager-scope]], [[institutional-groups]], [[manual-groups]], [[orcid-linking]].
- Public app: [[sample-search]], [[search-facets]], [[map-search-leaflet]], [[public-contributor-directory]], [[frontend-url-i18n]].
- Apps and UI: [[form-kit-and-hidden-values]], [[hierarchy-select-field]], [[frontend-conventions]], [[i18n-strategy]], [[sample-form-update-guide]].
- Platform: [[kysely-dbal]], [[api-trust-boundary-security]], [[rate-limiting]], [[mail-notifications]], [[preprod-infrastructure]], [[infra-parity-rule]], [[legacy-import]], [[sync-institutions-import]].
