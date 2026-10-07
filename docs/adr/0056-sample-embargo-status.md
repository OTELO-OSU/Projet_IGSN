# 0056. Sample embargo status

Date: 2026-10-07

## Status

Accepted.

## Context

A contributor may want a sample's IGSN and DOI minted now but its data public only later, for instance until a paper appears. ADR [0032](0032-sample-withdrawal-status.md) offers `withdrawn` as the only publish-without-being-public state, with no planned release.

## Decision

**`sample.status` gains a seventh value, `embargo`**, between `publish_failed` and `published` in `sampleStatusSchema.options`, so ADR [0033](0033-sample-tombstone-status.md)'s lifecycle sort places it correctly.

**`published_at` holds the planned release date.** `POST /admin/samples/:id/publish?status=embargo&publishedAt=` sets it in the future (after today, at most two years ahead, `embargoPublicationDateSchema`), it stays editable while under embargo, and a manual "Publish now" resets it to now.

**`embargo` is in `PERMANENT_IGSN_STATUSES`**, so the IGSN is minted, the DOI registered at DataCite and every field frozen exactly like a published sample.

**An embargoed sample resolves publicly like a withdrawn one**: the redacted page and the lineage node, via `toWithdrawnSample`, and out of search and facets. `GET /samples/:igsn` and the lineage root read the new `PUBLIC_SAMPLE_STATUSES` set (`published | withdrawn | embargo`) instead of an inline list.

**A daily job releases due samples.** `api/src/sample/service/release-due-embargoes.ts`, scheduled by croner at 06:00 Europe/Paris (`EMBARGO_RELEASE_CRON`, every minute on the dev stack), publishes every `embargo` sample whose `published_at` is due, each in its own try/catch. It assumes a single api replica, like the other workers.

**Every collaborator is mailed when an embargo starts and when it ends**, except the user who performed the operation, who already knows; the daily job has no actor and mails everyone. The moderated owner mail does not fire for an embargo publish.

**Transitions**: `draft -> embargo`, `embargo -> published` (an editor or the job), `embargo -> embargo` (date change), `embargo -> tombstone` (a manager, ADR 0033's rule), never `embargo -> withdrawn`. `domain/user-sample/can-set-sample-status.ts` encodes them.

### Rejected

- **An embargo flag on `withdrawn` with a new column**: it would need a second lock predicate and change ADR 0032's semantics.
- **A draft-like editable embargo**: the DOI is already registered at DataCite, so the sample must be as frozen as a published one.

## Consequences

- A caller deciding public resolution reads `PUBLIC_SAMPLE_STATUSES`, never a literal list.
- Tombstoning an embargoed sample keeps its future `published_at`.
- The migration's `down` moves embargo rows to `withdrawn`.
