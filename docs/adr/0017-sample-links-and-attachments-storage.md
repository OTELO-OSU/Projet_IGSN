# 0017. Sample links and attachments: child tables, blobs on disk

Date: 2026-07-20

## Status

Accepted.

## Context

A sample can carry any number of related DOI links (url plus optional
description) and any number of attached files (file plus optional
description). Earlier sub-data (location, description, condition) was 1:1
with the sample and became flat nullable columns; links and attachments are
the first one-to-many children, so that pattern does not apply. File content
also needs a home: the target infrastructure (Ceph) is not available yet.

## Decision

Two child tables, `sample_link` and `sample_attachment`, one row per link or
file, `sample_id` foreign key with `ON DELETE CASCADE`. `url` and the file
metadata columns are `NOT NULL`, so a description without its url or file is
impossible by construction. Ids are app-generated UUIDv7 and reads order by
id, so no position column is needed: creation order is entry order.

Links are part of the sample document: they ride the create/update payload
(`links` on `createSampleSchema`) and every save replaces them wholesale.
Attachments cannot (their content is binary), so they get their own
authenticated routes: multipart upload, description update, delete, download;
the public app downloads through the published-only IGSN lookup.

File content lives on the server filesystem (`ATTACHMENTS_DIR`, bind-mounted
to the gitignored `packages/api/attachments` in dev, test, and e2e so blobs
are inspectable), one blob per attachment at
`<sampleId>/<attachmentId>-<sanitized original name>`. Both ids are
server-generated uuids and the appended name is allow-listed to `[\w.-]`, so
no user-controlled path segment ever reaches the filesystem; the attachment
uuid keys the blob and makes identical file names collision-free, and the
readable name and per-sample folder are debug sugar. Only sample publication
metadata lives in Postgres; swapping the disk for Ceph later touches only the
fs calls in `attachment-repository.ts`.

Uploads are validated in `domain` (shared with the admin form): any file type
(documents, scans, photos, video...) under a 100 MB cap, enforced again by the
api at the trust boundary. The cap is what keeps the api's buffered upload
safe; raising it means streaming the multipart body instead.

## Consequences

- Every sample read (get, list, publish) hydrates children with two batched
  queries; no N+1 at list scale.
- Blob and row move inside one transaction on create; a commit failure can
  orphan a blob on disk, which nothing references. Acceptable; a sweep can
  reclaim them if it ever matters.
- Downloads are always `Content-Disposition: attachment` with `nosniff`: the
  media type is client-declared, so the browser must never render it inline.
