# One DataCite synchronization queue

## Context

`sample.status` mixes the lifecycle with the DataCite state (`publishing`, `publish_failed`), DataCite is written from four places, every direct edit blocks on a PUT, a queued re-publication hides a live sample, and series members never get `IsPartOf`.

Two PRs, the second branched off the first:

1. **Queue refactor and `synchronization_status`**: `status` keeps `draft | embargo | published | withdrawn | tombstone`; a nullable `synchronization_status` (`pending | synced | failed`, null when DataCite does not know the sample) queues every DataCite write except a single sample's first registration (admin publish, `POST /service/samples`), which stays synchronous. Sync state never affects visibility or blocks an edit; any save of a DOI-bearing sample re-queues it.
2. **Mirror relations**: a series member's record gains `IsPartOf`, the mirror of the series' `HasPart`, through the same queue.

Decided with the user: one `pending` value (the worker branches on `status = 'draft'`); a queued draft stays read-only and undeletable, a failed draft undeletable; `publishingError` becomes `synchronizationError`; a row exhausting its retries fails alone, no sweep; the sync state is displayed on the admin list and the sample details; the marker never queues a draft.

# Part 1: queue refactor and synchronization status

## Domain

- `sample/sample.ts`: drop the two statuses; add `synchronizationStatusSchema`; `Sample` gains `synchronizationStatus` (nullable) and `synchronizationError`.
- New `publication/is-publication-queued.ts`: `status === "draft" && synchronizationStatus === "pending"`, read by `canUpdateSample` (replaces `!== "publishing"`) and the admin publish guard. `canDeleteSample`: draft with null sync status. Drop the two cases from `can-declare-sub-sample.ts` and `can-duplicate-sample.ts`.
- `sample-validator.ts`: public response omits both fields; `listSamplesQuerySchema` gains `synchronizationStatus` (admin-only, like `existenceStatus`). `public-sample.ts` strips both, drops the two throws.
- `sample-batch/model.ts`: item `{ partnerId, id, status, synchronizationStatus, igsn, synchronizationError }`, reword descriptions. Delete the `sample_publishing` issue code in `service-sample-validator.ts`.
- Fixtures and specs carrying `publishingError` or the two statuses follow.

## API

- Migration: rename `publishing_error` to `synchronization_error`; add `synchronization_status text check (in ('pending','synced','failed'))`; backfill `pending` / `failed` / `synced` from the old statuses, then `status = case when igsn is null then 'draft' else 'published' end` for the two old ones; re-create `sample_status_check` and `sample_status_requires_igsn` (`status = 'draft' or igsn is not null`). `db.ts` follows.
- New `sample/service/mark-for-synchronization.ts`: `update sample set synchronization_status = 'pending' where id = any(ids) and status <> 'draft'`. Only the queue producers (`insertQueuedSample`, the retry) ever set `pending` on a draft; a failed draft edited by hand stays `failed` and reaches DataCite through Publish or Retry, never through a save or a relative's edit.
- Callers of the marker: end of `writeSample` (own id; drop its `dataCite` parameter), `setSampleStatus` before its read, `addSampleParents` (the parent, replacing the synchronous `syncParentRelations`), `publishSample` (`sample.parents`, replacing the `syncParentRelations` loop; also sets `synced`, error null). The parent's `IsSourceOf` mirror already exists through `listDoiChildren` and the full record; only its transport moves into the queue.
- Delete `datacite/sync-parent-relations.ts` and the `synced` wrapper in `sample/repository.ts` (`update` and `setStatus` become `tx(...)`).
- `queue-publication.ts`: insert sets `synchronization_status: "pending"` instead of `status: "publishing"`; update keeps only the `updated_at` guard (409) then `writeSample`. Rename both functions.
- `publishing-worker.ts` becomes `synchronization-worker.ts`: pick `pending order by id limit 1`; per row one transaction: `update ... set synchronization_status = 'synced', synchronization_error = null where id = ? and synchronization_status = 'pending' returning status` (the row lock serialises a concurrent edit, which re-marks after commit), then `publishSample` when `draft`, else `syncDoi(getSampleById)`; a thrown PUT rolls the mark back. Same `RETRY_DELAYS_MS`; on exhaustion mark that row `failed` with the message, `queueBatchWebhooks([id])`, `continue`. Keep `startPolling`; `main.ts` follows.
- `retryFailedPublications` becomes `retryFailedSynchronizations` (`failed -> pending`, same scope), route renamed `retry-synchronization`. `find-duplicate-samples.ts` batch scope: `status = 'published' or synchronization_status = 'pending'`. `sample-batch/repository.ts` columns, `sample-batch-routes.ts` (delete the `sample_publishing` branch), `admin-routes.ts` publish guard, `list-sample.ts` where, `to-sample.ts` mapping.
- `tests/insert-parent.ts`, `scripts/seed.ts`, `seed-demo-samples.ts`: failed-import rows become `draft` + `failed`, published rows `synced`.
- Specs: worker spec covers draft publication, published re-sync, mark rollback on a refused PUT, single-row failure, a parent's `IsSourceOf` landing through the queue; `publish-sample.spec.ts` asserts parents are marked, not PUT; the status-literal specs listed by the sweep move to `draft` + sync status.

## Admin, e2e, docs

- `sample-status-badge.tsx` only loses its two entries. New `synchronization-status-badge.tsx` takes `synchronizationStatus` alone and renders its value: nothing for null, "Synchronization pending" (blue), "Synchronized" (muted), "Synchronization failed" (red), never a label derived from the sample's status.
- Admin list (`sample-table.tsx`): the status cell renders the status badge then the sync badge. Sample details (`routes/samples.$sampleId.tsx`): the sync badge goes under the IGSN line in the header, and the destructive alert reads `synchronizationStatus === "failed" && synchronizationError`.
- Retry button and hook renamed, filtering `synchronizationStatus: "failed"`. `en.json` keys follow; fixtures and the badge, retry and edit-page specs follow.
- `frontend`: three spec fixtures.
- `e2e/support/db.ts`: drop `publish_failed`; page objects already poll "Published" / `status: "published"`.
- `docs/api-samples-batch.md`, `.claude/rules/architecture.md` (queue paragraph, `syncDoi` bullet), new ADR 0059 superseding 0052's status-as-queue, 0046's synchronous sync and 0058's partial parent PUT (check the number after a rebase).

## Verification

1. `pnpm -F @projet-igsn/api migrate`, then `pnpm test --project` for domain, api, admin, frontend.
2. `pnpm lint:check --quiet`, `pnpm fmt:check`.
3. `make test-e2e` once; read the passed count.
4. On `make dev`: publish a sub-sample and watch the parent re-PUT after the next tick; edit a published sample with the mock down, the badge reads "Synchronization pending" then "Synchronization failed", a new save re-queues it.

# Part 2: mirror relations

Core carries the forward relations only (`IsDerivedFrom` on a sub-sample, `HasPart` on a series, both from `toCoreRelations`). DataCite gets each mirror added at the api layer, read live at every sync so a record is always whole:

| Record                 | Forward (Core)         | Mirror (DataCite only)                      | Source of the mirror                                                      |
| ---------------------- | ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Parent of a sub-sample |                        | `IsSourceOf` each child holding an IGSN     | `sample_parent where parent_id = id` (exists, part 1 moves its transport) |
| Member of a series     |                        | `IsPartOf` its series when it holds an IGSN | `sample_series_membership where sample_id = id` (new)                     |
| Sub-sample             | `IsDerivedFrom` parent |                                             | `sample.parents`                                                          |
| Series                 | `HasPart` each member  |                                             | `sample.children`                                                         |

- `list-doi-children.ts` becomes `list-doi-relations.ts` answering `{ children, series }` in one place; `syncDoi` passes both to `toDataCiteSample(core, children, series)` (`domain/sample/datacite/to-datacite-sample.ts`), which gains the `IsPartOf` entry next to the existing `IsSourceOf` one.
- The member side is re-queued whenever the series side changes: `replaceSampleChildren` marks the removed (`returning("sample_id")` on its delete) and the new members; `publishSample` marks `sample.children` next to `sample.parents`. The marker's `status <> 'draft'` guard keeps a draft member out of the queue; it picks up `IsPartOf` on its own first registration since the source is read live.
- Specs: `to-datacite-sample.spec.ts` for the `IsPartOf` entry; the worker spec for a member's record landing after a children change; `publish-sample.spec.ts` for members marked on a series publish.
- Docs: `docs/datacite-mapping.md` (`IsPartOf` row), ADR 0057 amended ("a member carries no `IsPartOf`" superseded), `.claude/rules/architecture.md` series bullet.

## Verification

1. `pnpm test --project @projet-igsn/domain` and `@projet-igsn/api`; `pnpm lint:check --quiet`, `pnpm fmt:check`; `make test-e2e` once, the series spec covering the children change.
2. On `make dev`: set children on a published series, then watch each member's PUT in the api log carry `IsPartOf` after the next tick, and a removed member's PUT drop it.

## Plan removal

- Delete this `PLAN.md` in the last commit of part 2, once both PRs ship.
