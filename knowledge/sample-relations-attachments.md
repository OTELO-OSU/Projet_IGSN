---
type: persistence
title: Sample relations and attachments
description: >-
  Two cascading child tables; DataCite-shaped relations ride the sample
  document, attachments have their own routes and their blobs live on the server
  filesystem.
resource: packages/domain/src/sample/relation/model.ts
tags:
  - persistence
  - sample
  - relations
  - attachments
relations:
  - type: depends_on
    target: kysely-dbal
  - type: depends_on
    target: sample-status-lifecycle
  - type: depends_on
    target: igsn-identifier
status: stable
---

A sample carries any number of related resources (a DataCite-shaped `relation` to an identified target) and attached files, the first one-to-many children of `sample`. Relations replaced the earlier bare DOI links on 2026-09-01 (ADR 0017 update); the storage pattern did not change.

- Two child tables, `sample_relation` and `sample_attachment`, one row each, `sample_id` FK `ON DELETE CASCADE`. `relation_type`, `identifier_type`, `identifier`, `target_title` and the file metadata columns are `NOT NULL`. Ids are app-generated UUIDv7 and reads order by id, so creation order is entry order with no position column.
- **A relation is DataCite-shaped**: `relationType` (13 values, `is_cited_by` to `other`), `identifierType` (23 values, `igsn`, `doi`, `url`, `ark`...), `identifier`, a required `targetTitle`, then optional `targetResourceType` (the DataCite resourceTypeGeneral list), `relationTypeInformation`, `description`, and the three scheme fields (`relatedMetadataScheme`, `schemeURI`, `schemeType`) that `hasMetadataScheme` allows only under `has_metadata`, refused otherwise by the schema and hidden by the form.
- **Only three identifier types are format-checked**, in `relation/model.ts`: `doi` (`https://doi.org/10.xxxx/...` or `doi:10.xxxx/...`), `url` (http or https) and `igsn` (`igsnSchema`, so a legacy CNRS/TOAE identifier passes, see [[igsn-identifier]]). The other twenty are stored as typed. `IDENTIFIER_TYPES` declaration order is the picker order, the three validated ones first, and `identifierTypeLabel` keeps their canonical casing (`arXiv`, `RAiD`, `w3id`) so they are not translated.
- **The public page links by value, not by type**: `relationTargetHref` turns a `doi:` prefix into a `https://doi.org/` URL and passes any navigable URL through, while an `igsn` identifier that parses becomes an internal `/samples/$igsn` link; anything else renders the title with the raw identifier beside it.
- **Relations ride the sample document** (`relations` on `createSampleSchema`), every save replacing them wholesale (`replaceSampleRelations`). They are not frozen by publication and stay out of the withdrawn whitelist, so a withdrawn sample exposes none.
- **Attachments get their own authenticated routes**, their content being binary: multipart upload, metadata update (`title`, `targetResourceType`, `description`, all nullable), delete, download. The public app downloads through the public IGSN lookup, which 404s on a withdrawn or tombstoned sample ([[sample-status-lifecycle]]). `attachment_limit_exceeded` (default 5) is the one publish blocker touching this family.
- **Blobs live on the server filesystem** (`ATTACHMENTS_DIR`, bind-mounted to the gitignored `packages/api/attachments` in dev, test and e2e), one blob at `<sampleId>/<attachmentId>-<sanitized original name>`. Both ids are server-generated uuids and the appended name is allow-listed to `[\w.-]`, so no user-controlled path segment reaches the filesystem. Only publication metadata lives in Postgres, so swapping the disk for Ceph later touches only the fs calls in `attachment-repository.ts`.
- **Uploads are validated in `domain`**, shared with the admin form: any file type under a 100 MB cap, enforced again by the api. That cap is what keeps the buffered upload safe, so raising it means streaming the multipart body.
- Blob and row are not written in one transaction, so a commit failure can orphan a blob nothing references; a sweep can reclaim them if it ever matters.
- Downloads are always `Content-Disposition: attachment` with `nosniff`, the media type being client-declared.
- The admin upload budget is the shared per-user rate limit, which prices rather than prevents disk exhaustion ([[rate-limiting]]).
- In the admin, each relation and each attachment is one titled `fieldset` block (`Relation N`, `Attachment N`) with its delete button in the header, and a blank relation row is never dropped silently: it fails the save on its required fields until filled or removed ([[form-kit-and-hidden-values]]).
