# 0060. Series membership from the member

Date: 2026-10-09

## Status

Accepted.

## Context

ADR [0057](0057-virtual-sample-children.md) sets a series' members from the series alone (`childIds`).

A researcher editing a member needs to join, move or leave a series from its own side, and the member's DataCite record must name the series.

## Decision

- A published sample joins, moves or leaves a series through `seriesId` on the admin form, `PUT /service/samples/{igsn}` (also a batch update item) and bulk edit.
- The target series is eligible (`isEligibleSeries`) when it is virtual and its status is in `PUBLIC_SAMPLE_STATUSES`, and the user can edit it, over `/service` within the account's `managerScope`.
- The member is eligible (`canJoinSeries`) when its status is in `PUBLIC_SAMPLE_STATUSES`, it has no parent and it is not a series; a stored membership is ignored, a move replacing it.
- `createSampleSchema` refuses a `seriesId` beside any `parentIds`, so a sample never joins a series and gains a parent in one edit, nor gains a parent while a member; bulk edit refuses that row with `series_not_eligible`.
- Leaving, or moving away, needs no right on the series left.
- The series a member already holds is never re-checked, so a member claimed by a series owner still saves its own form.
- A sample joins a series once published: admin POST answers 422 `A sample joins a series once published` for a non-null `seriesId`, and `/service` POST, batch create and import refuse a series.
- Admin PUT answers 422 `Series not eligible` when a new non-null `seriesId` fails any check; `seriesId: null` leaves.
- `GET /admin/samples/series?search=` lists the published series the caller owns, edits or moderates.
- Over `/service`, a Core `IsPartOf` naming an IGSN is the series, mirroring `IsDerivedFrom` for the parent.
- The stored series IGSN keeps the membership, so a read-then-write round trip changes nothing.
- An unknown IGSN gives `series_not_found`; an out-of-scope or ineligible series, or a second `IsPartOf`, gives `series_not_eligible`.
- Both codes sit at `relations.<i>.targetIdentifier.value`; a draft series reads as `series_not_found`.
- Bulk edit reads a `Series IGSN` column placed after `Children IGSNs`: blank leaves, the stored IGSN or an absent column keeps, several IGSNs or an ineligible series gives `series_not_eligible`, an unknown one `series_not_found`.
- Bulk edit and `/service` PUT reach published samples only, so a withdrawn or embargoed member moves through the form.
- The member's DataCite record and every Core read carry `IsPartOf`, once the series has an IGSN.
- `seriesId` is a mailable field, the moderation mail showing a "Series of samples" line.

### Rejected

- Syncing the series' `HasPart` on every member-side change: it writes a second DataCite record, a record the member's owner may not own.
- Routing only `IsPartOf` targets that resolve to a series: a target's kind is not known when the relation is parsed, and the parent mapping already treats an IGSN target as the relation's meaning.

## Consequences

- The series' DataCite `HasPart` lags until the series' own next write.
