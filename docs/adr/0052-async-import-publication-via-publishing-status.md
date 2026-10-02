# 0052. Async import publication via a publishing status queue

Date: 2026-09-28

## Status

Accepted.

## Context

Phase 4 of the Excel bulk import must publish up to `MAX_IMPORT_ROWS` samples, each requiring a DataCite `PUT` (10s timeout, rate-limited). One HTTP request cannot hold 500 sequential registrations, and the original plan's whole-batch transaction left registered DOIs orphaned on a mid-batch rollback.

## Decision

The `sample.status` column is the queue, with two new values:

- `publishing`: committed by the import, waiting for registration; read-only for everyone (`canUpdateSample` refuses it), not deletable, invisible publicly.
- `publish_failed`: registration failed after retries; behaves like `draft` (editable, publishable; deletable until the 2026-10-02 amendment), with the failure text in the new `sample.publishing_error` column.

`POST /admin/samples/import` on a zero-issue workbook probes DataCite (`checkDataCite`, one authenticated `GET /dois?page[size]=1`; a null config passes, matching `publishSample`), aborts with 503 if unreachable, else inserts every sample as `publishing` in one transaction and answers 200 `{count}`.

One permanent worker (`api/src/sample/service/publishing-worker.ts`), started once in `main.ts`, is the only queue consumer: an infinite loop draining every `publishing` row oldest-first, then sleeping `POLL_MS`. Overlap is impossible by construction, one loop being the only thing that starts a pass. Per row it runs the existing `publishSample` in its own transaction: 1 attempt plus `RETRY_DELAYS_MS` retries (10s, 1m, 4m, 10m, 15m); on exhaustion it fails fast, marking that row and every waiting `publishing` row `publish_failed` with the error.

Idempotence rests on two facts: `generateIgsnSuffix(id)` is deterministic from the row's uuid, and the DataCite `PUT` is idempotent, so a crash between the `PUT` and the commit re-runs into the same DOI. A restart resumes stranded rows on the worker's first tick; a deploy delays publication, never loses it.

`publishSample` clears `publishing_error` in its UPDATE, so any later successful publish (the worker's or a human's on a `publish_failed` sample) erases the error. `PERMANENT_IGSN_STATUSES` (`published`, `withdrawn`, `tombstone`) replaces `status <> 'draft'` as `hasPermanentIgsn`'s definition, in TS and inline in SQL, keeping the two new statuses on the draft side of every permanence gate. `sample_status_requires_igsn` widens accordingly: the three pre-permanent statuses need no IGSN, so `published -> publishing -> published` keeps its IGSN across the queue.

`POST /admin/samples/bulk-edit` (`api/src/sample/bulk-edit/`) reuses the same two statuses for an already-published sample: it commits accepted edits as `publishing`, and the same worker republishes it under its existing IGSN, `published_at` and a DataCite `publish` event. Accepted consequences: the sample is hidden from the public while queued, and a failed republish leaves it `publish_failed`, on the draft side of every permanence gate, until "Retry publication" succeeds.

`POST /service/samples/batch` (ADR 0036) is a third producer: each item commits as `publishing`, a create or an update, in the batch's own transaction, and `GET /service/batches/{id}` is the partner's poll, reading the same `status` and `publishing_error` the worker writes.

### 2026-10-02

- `publish_failed` is no longer deletable, `canDeleteSample` allowing only `draft` (user decision).
- `publishSample` keeps an existing IGSN (`coalesce`), so a legacy `CNRS…` IGSN survives the queue.
- A queued update to a published sample guards `status = 'published'` and the `updated_at` its checks read.
- A sample changed in between answers 409 `{ error: "Sample changed, retry" }` and rolls the whole batch or bulk edit back.
- The fail-fast sweep is unchanged.

## Rejected

- One transaction for the whole batch with DataCite inside: a mid-batch failure rolls the DB back but leaves the already-PUT DOIs registered against vanished rows.
- A job-queue library (pg-boss et al.): unjustified for one job type on the single api replica every compose file runs. The worker carries a `ponytail:` comment naming `FOR UPDATE SKIP LOCKED` as the multi-replica upgrade.
- Per-import kicked drains serialized by a promise chain: correct in one process, but the guarantee rests on call-site discipline; a single permanent loop makes non-overlap structural.

## Consequences

- Up to `POLL_MS` latency before publication starts; the admin list shows `publishing` badges until refreshed.
- Fail-fast sweeps every waiting `publishing` row, including a concurrent import's (acceptable single-user alpha; per-import scoping would need an import-id column).
- A follow-up ships a one-button retry re-queueing `publish_failed` samples after re-checking their publish blockers.

See ADR [0046](0046-doi-lifecycle-sync.md) (syncDoi), ADR [0051](0051-excel-import-label-contract.md) (import validation).
