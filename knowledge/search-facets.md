---
type: feature
title: Public search facets registry
description: >-
  SAMPLE_FACETS in domain is the single source of truth for public sample-list
  filters; the admin lists take their own params instead.
resource: packages/domain/src/sample/search/facets.ts
tags:
  - search
  - domain
  - api
relations:
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: sample-status-lifecycle
  - type: depends_on
    target: kysely-dbal
status: stable
---

Public sample-list filters are driven by the `SAMPLE_FACETS` registry (`domain/sample/search/facets.ts`) as single source of truth. Adding or extending one goes through the `add-search-facet` skill.

- Facet kinds: hierarchy, enum, text, numeric range, manual group, contributor.
- A hierarchy facet filters with an ltree ancestor predicate, served by the GiST index at any depth ([[material-classification-ltree]]).
- The `searchable` flag on a `TreeNode` is the public facet policy alone; the admin collection-method filter (`admin/src/samples/collection-method-tree-nodes.ts`) offers every level regardless ([[vocabulary-tree]]).
- A query-schema drift guard and an API column allow-list keep the registry and the SQL in step; text facets keep a substring `ILIKE`.
- Facets only ever see `status = 'published'` rows ([[sample-status-lifecycle]]).
- The bounding-box param is its own filter, not a facet ([[map-search-leaflet]]), and the free-text box is its own mechanism ([[sample-search]]).
- The admin sample lists accept `ownerId` / `institution` / `manualGroup` / `status` on `listSamplesQuerySchema`, ANDed inside the caller's moderation scope; the three `institutional*` facet params stay dropped there, one param one meaning. `status` filters on `igsn`, never a `published` column, so the filter, the `sort: "status"` order and the admin badge all read one field.
