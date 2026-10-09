# 0057. Virtual sample children

Date: 2026-10-07

## Status

Accepted.

## Context

Researchers collect samples as a series (cores, dredges, individual samples) and need one citable IGSN for the whole set, while each member keeps its own IGSN.

A series is not a parent: its members are not derived from it, and a member belongs to one series only.

## Decision

- A virtual sample is a sample typed `serie_of_sample.<core|dredge|individual_sample>` that groups children.
- The sub-type is mandatory for publication and describes the series alone: a child may be of any type.
- A child points to its series through the `sample_series_membership` table: `sample_id` is its primary key (one series per member), `series_id` and `sample_id` both cascade, and a check refuses a self link.
- Claiming a child never writes the child row, so another user's edit lock or the child's queue state does not block it.
- No nesting: a series cannot be a child.
- A sample joins a series only if the user adding it can edit it (owner, editor, moderation reach or super admin, read for every added child in one `listSeriesLinkCandidates` query), and over `/service` only within the account's `managerScope`, editor rights on the child sufficing whatever its status (`isSampleEditor(effectiveRole(...))`).
- A held member cannot become a series: `writeSample` refuses the change (422 `child_not_eligible`) for the form, `/service` and bulk edit alike.
- A series has no parents and no sub-samples: `canDeclareSubSample` refuses it as a parent on every create path (form, import, `/service`), and `canBecomeSeries` refuses the series type to a sample with a parent or a sub-sample on every update path (form, `/service`, bulk edit `series_in_lineage`), the form not offering it.
- Children inherit nothing from the series and stay public and searchable.
- Children are editable after publication through the form, `/service` and bulk edit.
- `replaceSampleChildren` enforces the claim atomically: a child held by any series, draft included, cannot be taken (422).
- Lineage walks `sample_parent` and the series link as one edge set, so a sub-sample reaches the series through its ancestors.
- Core and DataCite carry `HasPart` per child on the series, accepted on input; a member's `IsPartOf` comes with ADR [0060](0060-series-membership-from-the-member.md).
- Bulk edit sets children with a `Children IGSNs` column of its export; the import template has none, a series holding children only once published.
- An imported series row fills both type levels, the template requiring no extra column.
- Children are set on a published series only (`canSetSampleChildren`): admin POST, and PUT of an unpublished series, answer 422 `CHILDREN_NEED_PUBLICATION`.
- A member is eligible (`isEligibleChild`) when its status is in `PUBLIC_SAMPLE_STATUSES` (published, withdrawn or embargo), it is not a sub-sample, it is not a series and it is in no other series.
- A sub-type change keeps the current children.
- A member the series already holds is never re-checked.
- A membership change writes only the series' DataCite record, never a member's, and fires no batch webhook.
- `/service` refuses an unknown child with `child_not_found` and an ineligible one with `child_not_eligible`.

### Rejected

- Reusing `sample_parent`: a series member is not derived from it, and the table allows two parents.
- A flag on `sample_parent`: it keeps the many-to-many shape for a one-to-many relation.
- A column on `sample`: claiming a child writes its row, colliding with its edit lock and queue state.
- Bounding a child's type by the series' sub-type: a researcher groups mixed hauls under one series, and the bound forced a type change to release every member.

## Consequences

- A child cannot move to another series until the first one releases it.
