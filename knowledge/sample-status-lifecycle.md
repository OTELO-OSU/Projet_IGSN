---
type: domain-model
title: Sample status lifecycle and its three predicates
description: >-
  status is draft | published | withdrawn | tombstone, read through three
  distinct predicates for permanence, public visibility and public resolution.
resource: packages/domain/src/sample/publication
tags:
  - domain
  - sample
  - publication
relations:
  - type: depends_on
    target: published-field-locks
  - type: depends_on
    target: space-manager-scope
  - type: depends_on
    target: publish-blockers
status: stable
---

`sample.status` is an enum, `draft | published | withdrawn | tombstone`. There is no `published` boolean and no single `isPublished` to misuse.

Transitions:

- `draft -> published`, and a draft may publish straight to `withdrawn` (`POST /admin/samples/:id/publish?status=withdrawn`), minting the IGSN without ever being public.
- `published <-> withdrawn` via `PUT /admin/samples/:id/status`, editor-only, 409 on a draft.
- `published | withdrawn <-> tombstone`, never from or to `draft`.
- A sample never returns to `draft`.

Three predicates, all read off `status`:

- `status <> 'draft'` (`hasPermanentIgsn`, `domain/sample/publication/has-permanent-igsn.ts`, inline in SQL): IGSN permanence. Frozen fields, contributor edit rights, the non-GET `canPublishSamples` guard, manual-group deletion and detach guards.
- `status = 'published'`: public visibility. Public search list, public contributor facet, public manual-group facet.
- `status in ('published', 'withdrawn')`: public resolution at `GET /samples/:igsn`, plus the contact form and attachments (`getPublicSampleByIgsn`).

Redaction and visibility:

- A withdrawn sample resolves as a redacted payload built by `toWithdrawnSample` (`withdrawn-sample.ts`), a field-by-field whitelist and never a spread, so a new `Sample` field stays private by default. `toPublicSample` (`public-sample.ts`) picks by status; `GET /samples/:igsn` answers a discriminated union on `status`.
- A published sample is public whole but for the fields `redact-archive-contacts.ts` drops (the two archive contacts, admin-only), applied by `toPublicSample` and the public list route.
- A tombstone is a 404 to everyone but a super admin or an in-reach space manager ([[space-manager-scope]]); a caller with no access at all still gets 403 first, so a stranger cannot distinguish a tombstone from a forbidden sample. Non-GET answers 409 except the status endpoint. "My samples" hides tombstones, the moderation list shows them.
- Who may move a sample between permanent statuses is `domain/user-sample/can-set-sample-status.ts`, read by both the api route and the admin status menu; tombstoning is gated on management reach, not the editor role, and outranks ownership.
- `sort=status` orders by lifecycle position over `sampleStatusSchema.options`.
- No mail and no audit trail on withdraw, republish, tombstone or restore.
