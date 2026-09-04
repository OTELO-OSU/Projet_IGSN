# 0032. Sample withdrawal status

Date: 2026-08-26

## Status

Accepted.

## Context

A published sample keeps a permanent IGSN, but an owner may want it out of public view (a mistake, a request, a paper retracted) without losing the identifier or the audit trail. Publication was a boolean, `published`, so nothing could distinguish "was published, hidden now" from "never published".

## Decision

**`sample.status` is an enum, `draft | published | withdrawn`, replacing the `published` boolean.** A sample never returns to `draft`: `draft -> published <-> withdrawn`, and a draft may also publish straight to `withdrawn` (`POST /admin/samples/:id/publish?status=withdrawn`, offered discreetly behind the Save & Publish chevron), minting the IGSN without ever being public. Withdrawing and republishing never re-mint the IGSN and never touch `publicationYear`.

**Two predicates replace the old single boolean, picked by what the site actually needs:**

- **Not a draft** (`status <> 'draft'`): IGSN permanence rules. Frozen fields, `mergePublishedEdit`, a contributor loses edit rights, the `canPublishSamples` guard on non-GET, manual-group deletion and detach guards. A withdrawn sample keeps its identity frozen exactly like a published one.
- **Publicly visible** (`status = 'published'`): the public search list, the public contributor facet (`GET /users`), the public manual-group facet (`GET /manual-groups`). A withdrawn sample drops out of all three.

**A withdrawn sample still resolves at `GET /samples/:igsn`, as a redacted payload.** `domain/sample/publication/withdrawn-sample.ts` builds it: `toWithdrawnSample(sample)` picks a fixed whitelist field by field, never a spread, so a field added to `Sample` later stays private by default: `igsn`, `name`, `nature`, `type`, `material`, `location` narrowed to `region` and `localityName`, `collectorName`, and `collectionCurator` (the last one only from the `collection_specimen` provenance arm). `GET /samples/:igsn` returns a discriminated union on `status` (`publicSampleResponseSchema`), the full `sampleSchema` for `published`, `withdrawnSampleSchema` for `withdrawn`. Attachments 404 on a withdrawn sample; the contact form still works, since it reaches the owner, not the redacted data.

**Toggling is one endpoint**, `PUT /admin/samples/:id/status`, editor-only, 409 on a draft. The admin edit page renders `SampleStatusButton`, next to the existing publish action, offering "Withdraw" on a published sample and "Republish" on a withdrawn one.

### Rejected

- **A second `withdrawn` boolean** alongside `published`: two independently settable flags allow the nonsense state "withdrawn but never published", and every one of the call sites above would need its own combination of the two instead of one status read.

## Consequences

- `getPublishedByIgsn` is renamed `getPublicByIgsn`, since it now resolves both `published` and `withdrawn` rows.
- A caller that reaches for "is this locked down as an IGSN identity" or "is this shown to the public" must pick the matching predicate; there is no single `isPublished` left to misuse for the other case.
- **Deferred**: no moderation mail fires on withdraw or republish. No lifecycle sort weight for `status` in a list: alphabetical order (`draft`, `published`, `withdrawn`) happens to match the lifecycle today, so nothing was added to keep it that way if a status is inserted later.
