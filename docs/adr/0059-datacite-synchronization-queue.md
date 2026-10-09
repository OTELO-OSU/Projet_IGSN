# 0059. One DataCite synchronization queue

Date: 2026-10-09

## Status

Accepted.

Supersedes the status-as-queue of ADR [0052](0052-async-import-publication-via-publishing-status.md), the synchronous sync of ADR [0046](0046-doi-lifecycle-sync.md) and the partial parent PUT of ADR [0058](0058-parents-added-after-creation.md).

## Context

- ADR 0052 made `sample.status` the queue (`publishing`, `publish_failed`), so a queued sample left its real status and a bulk edit hid a published sample from the public.
- ADR 0046 sent every other write to DataCite synchronously, inside the user's request, so a DataCite outage failed an edit.
- ADR 0058 added a partial `relatedIdentifiers` PUT on the parent, a third path to DataCite.
- Three paths meant three failure behaviors, and fail-fast swept unrelated rows.

## Decision

`sample.synchronization_status` (`pending | synced | failed`, null for a sample DataCite does not know) and `sample.synchronization_error` replace `publishing`, `publish_failed` and `publishing_error`. `status` keeps `draft | embargo | published | withdrawn | tombstone`, and a queued sample keeps its own.

The marker rule:

- `markForSynchronization` sets `pending` on non-draft rows only.
- `insertQueuedSample` (import, `/service` batch create) and `retryFailedSynchronizations` alone set it on a draft.
- A direct write (admin and `/service` edits, status changes, embargo release) marks the row `pending` and calls DataCite no more.
- A parent added to a child holding an IGSN marks the parent `pending`, and publishing a sub-sample marks its parents, replacing the partial PUT (`sync-parent-relations.ts` is deleted).
- `updateUnchangedSample` (bulk edit, batch update) guards `status = 'published'` and `updated_at` (409 "Sample changed, retry"), writes, then marks `pending`.

One permanent worker, `api/src/sample/service/synchronization-worker.ts`, is the only consumer:

- It picks pending rows by id and runs one transaction per row.
- The transaction marks `synced` before the DataCite call, so a refused PUT rolls the mark back.
- A draft goes through `publishSample`, any other row through `syncDoi`, with ADR 0052's retry ladder.
- On exhaustion only that row becomes `failed` with its error, its batch webhook is queued and the drain continues, with no sweep.
- A successful re-PUT also queues the batch webhook, so a partner's batch update is notified, and a later admin edit of that sample notifies it again.

A single sample's first registration (admin publish, `POST /service/samples`, the worker's draft branch) still PUTs synchronously inside `publishSample`, since the user needs the IGSN back.

A pending draft is read-only and undeletable (`isPublicationQueued`, 409 on publish), a failed draft is undeletable, and `canDeleteSample` allows a draft with a null status only. A failed draft edited by hand stays `failed` and is published through Publish or "Retry synchronization".

`GET /service/batches/{id}` and its webhook carry `{ partnerId, id, status, synchronizationStatus, igsn, synchronizationError }`, and the `sample_publishing` issue code is gone. The migration backfills the column and turns the two old statuses into `draft` (no IGSN) or `published` (IGSN).

## Rejected

- Keeping the status as the queue: a queued update hides or demotes a published sample, and each new write path adds a status.
- A sweep failing every waiting row on one exhaustion: a single bad row or one transient outage fails unrelated samples.
- Synchronous relative PUTs: they keep a second DataCite path alive inside the request and fail the user's edit on an outage.

## Consequences

- A DataCite outage costs each row its own retry ladder, about 30 minutes, before it fails.
- A change reaches DataCite up to `POLL_MS` later.
- A withdrawn or tombstoned sample's DataCite state lags the queue.
- The admin shows a synchronization badge beside the status badge, and the lists filter on `synchronizationStatus`.
