---
type: persistence
title: Sample links and attachments
description: >-
  Two cascading child tables; links ride the sample document, attachments have
  their own routes and their blobs live on the server filesystem.
resource: packages/api/src/sample/attachment-repository.ts
tags:
  - persistence
  - sample
  - attachments
relations:
  - type: depends_on
    target: kysely-dbal
  - type: depends_on
    target: sample-status-lifecycle
status: stable
---

A sample carries any number of DOI links (url plus optional description) and attached files (file plus optional description), the first one-to-many children of `sample`.

- Two child tables, `sample_link` and `sample_attachment`, one row each, `sample_id` FK `ON DELETE CASCADE`. `url` and the file metadata columns are `NOT NULL`, so a description without its url or file is impossible. Ids are app-generated UUIDv7 and reads order by id, so creation order is entry order with no position column.
- **Links ride the sample document** (`links` on `createSampleSchema`), every save replacing them wholesale.
- **Attachments get their own authenticated routes**, their content being binary: multipart upload, description update, delete, download. The public app downloads through the public IGSN lookup, which 404s on a withdrawn or tombstoned sample ([[sample-status-lifecycle]]).
- **Blobs live on the server filesystem** (`ATTACHMENTS_DIR`, bind-mounted to the gitignored `packages/api/attachments` in dev, test and e2e), one blob at `<sampleId>/<attachmentId>-<sanitized original name>`. Both ids are server-generated uuids and the appended name is allow-listed to `[\w.-]`, so no user-controlled path segment reaches the filesystem. Only publication metadata lives in Postgres, so swapping the disk for Ceph later touches only the fs calls in `attachment-repository.ts`.
- **Uploads are validated in `domain`**, shared with the admin form: any file type under a 100 MB cap, enforced again by the api. That cap is what keeps the buffered upload safe, so raising it means streaming the multipart body.
- Blob and row are not written in one transaction, so a commit failure can orphan a blob nothing references; a sweep can reclaim them if it ever matters.
- Downloads are always `Content-Disposition: attachment` with `nosniff`, the media type being client-declared.
- The admin upload budget is the shared per-user rate limit, which prices rather than prevents disk exhaustion ([[rate-limiting]]).
