# 0063. The collection date is optional on collection specimens

Date: 2026-10-19

## Status

Accepted. Amends ADR [0045](0045-sub-sample-collection-date-and-public-list-default.md).

## Context

A collection specimen (a museum or archive piece) often has no known collection date, yet `collection_date_missing` blocked its publication.
A sub-sample inherits its date from its parents and has no date field of its own, so a sub-sample of a dateless specimen could never publish.

## Decision

`collection_date_missing` fires only on a sample with no parent whose provenance status is not `collection_specimen` (a research project sample, or no scientific context yet).
A collection specimen publishes without a collection date, and a sub-sample publishes with whatever date it inherits, possibly none.

The public `/service` Core contract follows.

- `production.collection_date_start`, `collection_date_end` and `collectionDatePrecision` are optional, all three together or none.
- DataCite gets no `Collected` date for a dateless sample.
- The OMS sampling `startTime`, `endTime` and `timePrecision`, and the iSamples `result_time`, are optional too.

The admin form shows a sub-sample's collection date disabled with its inherited value, instead of hiding it.

## Consequences

- Partners may now read published samples with no collection date.
- Amends ADR 0045: a sub-sample of dateless parents now publishes by design, not as a sharp edge, since the blocker skips sub-samples.

## Rejected

- **Keeping the date required on research project sub-samples.** A sub-sample of a dateless collection specimen could never publish, having no date field of its own.
