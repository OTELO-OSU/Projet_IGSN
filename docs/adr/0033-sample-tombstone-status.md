# 0033. Sample tombstone status

Date: 2026-08-28

## Status

Accepted.

## Context

A published or withdrawn sample keeps a permanent IGSN (ADR 0032), so it cannot be deleted. A space manager still needs a way to remove a sample from view, for a request or a mistake, without breaking that permanence.

## Decision

**`sample.status` gains a fourth value, `tombstone`.** Transitions are `published | withdrawn <-> tombstone`, never from or to `draft`: `setSampleStatusBodySchema` accepts `tombstone` but `publishStatusSchema` (draft's own publish endpoint) excludes it.

**Entering or leaving `tombstone` is gated on management reach, not the editor role.** `PUT /admin/samples/:id/status` refuses the change (403) unless the caller is a super admin or an in-reach space manager (ADR 0030's scope), computed as `managed` by `require-sample-access.ts` for every found sample, owner included; `moderating` stays `managed && !owner`.

**A tombstoned sample is invisible to everyone but its managers, as a 404.** A caller with no access to the sample at all still gets the usual 403 first, so a stranger cannot distinguish a tombstone from an existing-but-forbidden sample; only a caller who could otherwise see it, but lacks management reach, is turned away with 404. `require-sample-access.ts` also answers 409 to every non-GET but the status endpoint itself, since nothing but a restore may touch a tombstone.

**A third predicate joins ADR 0032's two**, all three read off `status`:

- `status <> 'draft'`: permanence (frozen fields, edit rights).
- `status = 'published'`: public visibility (search, facets).
- `status in ('published', 'withdrawn')`: publicly resolvable, gating `getPublicSampleByIgsn`, so `GET /samples/:igsn`, the contact form and attachments 404 on a tombstone exactly as they would on an unknown IGSN.

**`sort=status` now orders by lifecycle position** over `sampleStatusSchema.options` rather than alphabetically, closing the sort weight ADR 0032 deferred: alphabetically `tombstone` lands between `published` and `withdrawn`, out of lifecycle order.

**"My samples" hides tombstones; the moderation list shows them**, so an owner loses no visibility they still have a right to beyond what management reach already grants.

## Rejected

- **Hard delete**: the same reason as ADR 0032, a permanent IGSN cannot be deleted.
- **A separate `removed` boolean** alongside `status`: ADR 0032 already rejected the equivalent `withdrawn` boolean for the nonsense states it allows and the call sites it duplicates; the same holds here.
- **A public tombstone page**: a plain 404 needs no redaction whitelist and leaks nothing; ADR 0032's redacted withdrawn page stays the only public status page.

## Consequences

- An owner without management reach loses the sample from their list and cannot open its edit page, even though they created it: tombstoning outranks ownership.
- ADR 0032's deferred lifecycle sort weight is now implemented.
- **Deferred**, matching ADR 0032's stance: no mail to the owner on tombstone or restore, no audit trail.
