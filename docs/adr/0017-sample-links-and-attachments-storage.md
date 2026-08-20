# 0017. Sample links and attachments: child tables, blobs on disk

Date: 2026-07-20

## Status

Accepted

## Context

A sample can carry any number of related DOI links (url plus optional description) and any number of attached files (file plus optional description). Earlier sub-data (location, description, condition) was 1:1 with the sample and became flat nullable columns, so that pattern does not apply to the first one-to-many children. File content also needs a home, the target infrastructure (Ceph) not being available yet.

## Decision

**Two child tables**, `sample_link` and `sample_attachment`, one row per link or file, `sample_id` foreign key with `ON DELETE CASCADE`. `url` and the file metadata columns are `NOT NULL`, so a description without its url or file is impossible by construction. Ids are app-generated UUIDv7 and reads order by id, so creation order is entry order and no position column is needed.

**Links ride the sample document** (`links` on `createSampleSchema`), every save replacing them wholesale. Attachments cannot, their content being binary, so they get their own authenticated routes: multipart upload, description update, delete, download, the public app downloading through the published-only IGSN lookup.

**File content lives on the server filesystem** (`ATTACHMENTS_DIR`, bind-mounted to the gitignored `packages/api/attachments` in dev, test and e2e so blobs are inspectable), one blob per attachment at `<sampleId>/<attachmentId>-<sanitized original name>`. Both ids are server-generated uuids and the appended name is allow-listed to `[\w.-]`, so no user-controlled path segment ever reaches the filesystem; the attachment uuid keys the blob and makes identical file names collision-free, while the readable name and per-sample folder are debug sugar. Only publication metadata lives in Postgres, so swapping the disk for Ceph later touches only the fs calls in `attachment-repository.ts`.

**Uploads are validated in `domain`**, shared with the admin form: any file type under a 100 MB cap, enforced again by the api at the trust boundary. The cap is what keeps the api's buffered upload safe, so raising it means streaming the multipart body instead.

## Consequences

- Every sample read (get, list, publish) hydrates children with two batched queries, so there is no N+1 at list scale.
- Blob and row move inside one transaction on create, so a commit failure can orphan a blob nothing references. Acceptable; a sweep can reclaim them if it ever matters.
- Downloads are always `Content-Disposition: attachment` with `nosniff`: the media type is client-declared, so the browser must never render it inline.
