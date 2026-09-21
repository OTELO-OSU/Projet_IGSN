# 0046. DOI lifecycle sync on update and status change

Date: 2026-09-21

## Status

Accepted.

## Context

ADR 0044 registers a DOI at DataCite on publication alone. It left as an open consequence that `PUT /admin/samples/:id/status` and later metadata edits are not synced to DataCite. This closes it: every write of a DOI-bearing sample re-PUTs its full record.

## Decision

`api/src/datacite/sync-doi.ts` (`syncDoi`) is the one DataCite write, called by `publishSample`, `updateSample` and `setSampleStatus`. It PUTs the full record every time, `url` and `event` the only fields that vary with status:

| Our status | DataCite state | DataCite `url`                 |
| ---------- | -------------- | ------------------------------ |
| published  | findable       | `<FRONTEND_URL>samples/<igsn>` |
| withdrawn  | registered     | `<FRONTEND_URL>samples/<igsn>` |
| tombstone  | registered     | `<FRONTEND_URL>tombstone`      |

- `publishSample` keeps sending `publish` for `published` and `register` for `withdrawn`, since the DOI is new there and `register` is the only event that works from DataCite's own draft state.
- Every later write (`updateSample`, `setSampleStatus`) sends `publish` when our status is `published`, `hide` otherwise; `hide` moves findable to registered and is a no-op on an already-registered DOI, so a stateless status-to-event map is enough (DataCite's `aasm whiny_transitions: false`).
- A tombstoned sample's `url` points at one shared public page, `/tombstone`, in `frontend`, naming no sample; every other status points at the sample's own landing page.
- `syncDoi` runs inside the same transaction as the write, same 10s timeout and 502 on refusal or timeout as ADR 0044's publish call, so nothing commits without a synced DOI.
- The `!config || !sample.doiPrefix` guard is unchanged from ADR 0044: an unconfigured stack or a sample published before DataCite was configured is never synced.

See ADR [0032](0032-sample-withdrawal-status.md) (withdrawal), ADR [0033](0033-sample-tombstone-status.md) (tombstone), ADR [0044](0044-doi-registration-on-publication.md) (initial registration, superseded here for the update/status-change gap).

## Rejected

- **Async or fire-and-forget sync.** Same reason as ADR 0044: leaves DataCite out of step with a committed edit and nothing retrying it.
- **A per-sample `/samples/:igsn/tombstone` page.** Would name a sample the api still refuses to serve (ADR 0033), reopening the redaction the public site enforces.
- **A redacted tombstone payload from the api.** Needs a new field-by-field whitelist and reverses ADR 0033's stance deeper than a landing-page swap warrants.

## Consequences

- Every tombstoned DOI resolves to the same page, so a visitor following the DOI cannot tell which sample it was.
- A DataCite outage now blocks an edit or a status change of any DOI-bearing sample, not publication alone.
- A sample published before DataCite was configured (no `doiPrefix`) stays never synced, ADR 0044's gap carried forward.
- A withdrawn or tombstoned sample still sends its full record to DataCite while the public site redacts it (ADR 0044's consequence, unchanged here).
