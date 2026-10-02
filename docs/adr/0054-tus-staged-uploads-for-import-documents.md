# 0054. Tus staged uploads for import documents

Date: 2026-10-02

## Status

Accepted.

## Context

The bulk import sent its documents as `documents[]` parts of one multipart request. Node's 300 s body timeout and Keycloak's 300 s tokens killed slow uploads, and a network error re-sent the whole payload.

## Decision

Import documents upload through the tus protocol before the import, using `@tus/server` and `@tus/file-store` in `api` and `tus-js-client` in `admin`, in sequential 8 MiB chunks.

- Staging is filesystem-only under `ATTACHMENTS_DIR/staging` (data file plus info json), with no database table.
- Ownership is stamped server-side into the upload metadata from the verified token, through an overwritten `x-owner-id` header, never trusted from the client.
- `ATTACHMENT_MAX_BYTES` (100 MB) is the per-upload ceiling, enforced as tus `maxSize`, now the only enforcement point.
- A user may stage at most 50 GB not yet imported, checked at upload creation.
- A staged upload expires after 24 h, swept hourly.
- `POST /admin/samples/import` references uploads by `stagedUploadIds[]`.
- An unknown, foreign, incomplete, expired or consumed id gets one generic 400.
- The publishing transaction copies each upload into the sample attachment path, and the uploads are deleted once it commits, so a rolled-back import keeps them for a retry with the same ids.
- A replayed import therefore answers 400 instead of duplicating samples.

## Rejected

- One multipart request with a raised server timeout and a per-attempt token refresh: reasonable, but a network error still re-sends everything.
- A hand-rolled chunk endpoint with a database staging table: more code and a schema to maintain for what the protocol already defines.

## Consequences

- The per-sample attachment upload is expected to migrate onto this mechanism in a later ticket.
- Cross-reload resume is off (`storeFingerprintForResuming: false`), and is the protocol's native extension path.

See ADR [0052](0052-async-import-publication-via-publishing-status.md) (import publication).
