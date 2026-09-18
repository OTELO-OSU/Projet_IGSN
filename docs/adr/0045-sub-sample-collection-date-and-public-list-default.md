# 0045. A sub-sample's collection date is derived, and it stays off the default public list

Date: 2026-09-18

## Status

Accepted.

## Context

Process steps landed in ADR 0044, on the parent tab. Three follow-up gaps remained on a sub-sample:

- Its collection date was typed like a root sample's, though a sub-sample was collected the same moment as its parent(s), never a second time.
- The public sample list showed sub-samples mixed in with root samples, with no way to browse only the primary declarations a reader usually wants.
- The process steps sat in a tab of their own, away from the identity fields a contributor fills first. They now sit in the Identity tab after the collection date, and the parent tab keeps its hint and links.

## Decision

### Collection date: derived on every write

A sub-sample's collection date is computed from its parent(s), not entered.

- One parent: its date. Two parents: the earliest start to the latest end.
- Always day precision: an hour-precision parent contributes its calendar days and its time zone is dropped, so nothing ever combines two zones.
- The rule is one pure function, `domain/sample/parent/inherited-collection-date.ts`, with no I/O.
- The api calls it on every write, at insert and at update (`inheritParentCollectionDate`), and overwrites whatever the payload carried. It cannot live in `createSampleSchema`: the rule needs the parents' stored dates, and a schema refinement has no database access.
- It runs on update too, unlike `inheritParentLocation`, which is insert-only: the collection date is in neither lock map of `published-field-lock.ts`, so an admin PUT to a draft or a `/service` PUT to a published sub-sample would otherwise write the client's date. Adding a lock entry instead was rejected: it would freeze the field for root samples too, where it is the contributor's to edit.
- The admin form still submits a collection date for a sub-sample (composed from its parents, no widget) and never excludes it. Excluding it would fire `collection_date_missing` on a sample that has one.
- A sub-sample of dateless parents publishes with no collection date and no field to fix it. That is a deliberate sharp edge: a sample can only inherit what its parents have.
- The date is hidden from display (the admin form and the public page) since it is not information about the sub-sample itself, but it is kept in storage so the sample still answers the public collection-date filter.

### Public list: sub-samples excluded by default

`GET /samples` now excludes a sub-sample unless the reader asks for it, through a new `includeSubSamples` facet.

- **This changes what an existing shared search URL returns.** A URL saved before this change could include sub-samples in its results; after, it does not, unless it already carries `includeSubSamples=true`. The PO accepted this.
- The filter is a new `boolean` facet kind (`domain/sample/search/facets.ts`), the first facet where **absent means a filter is applied** rather than absent meaning no filter. Every other facet's absence means "unrestricted"; `includeSubSamples` absent means "sub-samples excluded". `searchQueryParams` (`frontend/src/domain/samples/search-params.ts`) had to stop counting a defaulted facet when deciding whether a search exists at all, or a bare page load would look like an active search.
- The filter lives in `listPublishedSamples` alone (`excludeSubSamplesFilters` in `api/src/sample/service/facet-filter.ts`), not in the shared `listSamplesWhere`. The contributor's own list, the moderation list and `/service` all read every sub-sample regardless of the flag.

### `/service` deliberately does not get the flag

Adding `includeSubSamples` to `SAMPLE_FACETS` auto-exposed it on `/service` through `CORE_FILTER_PARAM`'s drift-guard spec, since that guard checks every facet param is named there. The PO chose to remove it from the Core surface instead of naming it: `GET /service/samples` keeps returning every published sample, sub-samples included, so no machine client's existing integration breaks.

The guard now subtracts a named exclusion set, `NON_CORE_FACET_PARAMS` (`domain/sample/core/core-list-samples-query.spec.ts`), rather than requiring every facet to have a Core name.

This is a deliberate, permanent divergence between the public web surface (defaults to root samples, a reader's mental model) and the Core machine surface (every published sample, a client's contract must not shift under it). A future facet meant for readers alone follows the same path: add it to `NON_CORE_FACET_PARAMS`, document why here or in a follow-up ADR.

### Rejected

- **Making the sub-sample's collection date editable and validating it matches a parent.** Redundant data that can drift; deriving it removes the possibility of disagreement entirely.
- **Keeping the hour and time zone when every parent has them.** Two parents in different zones need a conversion into one of them, a rule for which zone wins, and a widening of a day-only sibling to `T00:00`. The derived date only feeds the public collection-date filter, which is day-grained, so none of that precision is worth its edge cases.
- **Excluding the collection date from the sub-sample's submitted payload.** Would require re-deriving the publish-readiness check without the field ever reaching the schema; simpler to submit the composed value and let the api overwrite it.
- **Re-deriving the date on every read instead of on write.** Would need a second query per list row; the api's own list route already reads only the stored sample row. Deriving on write keeps the value ordinary storage that the reads never special-case.
- **Making `includeSubSamples` a normal facet (absent = no filter).** Would default the public list to a mix of root and sub-samples, the exact problem this ADR fixes.
- **Exposing `includeSubSamples` on `/service` for symmetry.** Rejected by the PO: no machine client asked for sub-sample exclusion, and adding it there risks a client silently getting fewer rows on a future default flip.

## Consequences

- A shared public search URL predating this change returns fewer results (root samples only) unless `includeSubSamples=true` is added to it.
- A second "defaulted" facet, should one ever be needed, follows `includeSubSamples`'s `boolean` kind in `SAMPLE_FACETS` (absent means off), which `searchQueryParams` already leaves out of the empty-search check.
- `/service` and the public list can now answer a different sample count for the same otherwise-empty query; documented in `docs/igsn-core-mapping.md`.
- A sub-sample's collection date can never be corrected by hand: fixing a wrong one means fixing the parent's date, then saving the child, which re-derives it. Nothing re-derives a child whose parent changed until that child is next saved.
