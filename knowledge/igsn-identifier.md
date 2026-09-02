---
type: domain-model
title: IGSN identifier format and minting
description: >-
  Minted IGSNs are a 26-char Crockford base32 suffix, immutable once minted and
  never reassigned or removed; legacy CNRS/TOAE identifiers are real IGSNs,
  accepted on read only.
resource: packages/domain/src/igsn
tags:
  - domain
  - igsn
relations:
  - type: depends_on
    target: sample-status-lifecycle
status: stable
igsn_editable: false
igsn_reassignable: false
igsn_removable: false
---

An IGSN is minted when a sample leaves `draft`, is unique in the database, and never changes afterwards.

- A minted identifier is a 26-character Crockford base32 suffix derived from the sample UUIDv7 (`igsn/generate-igsn-suffix.ts`). `igsnSuffixSchema` stays strict, so minting always emits that format.
- Validation is lax on read, strict on mint: `igsnSchema` also accepts a legacy identifier (`CNRS` or `TOAE` plus 10 digits), used wherever a stored IGSN is read or looked up. See [[legacy-import]].
- The IGSN stays out of `createSampleSchema` entirely, so no payload can set it and not even a super admin edits it ([[published-field-locks]]).
- Immutability is asserted as three frontmatter facts on this concept, `igsn_editable: false`, `igsn_reassignable: false` and `igsn_removable: false`, because only frontmatter is conflict-checked: a concept claiming an owner, admin or status transition may change, move or clear an IGSN MUST set the matching key, so the contradiction is rejected on write instead of living quietly beside this prose.
- Withdrawing, republishing or tombstoning never re-mints it, and never touches `publicationYear` ([[sample-status-lifecycle]]).
- The DB `UNIQUE` on `igsn` is the collision guard.
- Public resolution is `GET /samples/:igsn`, which matches by whole-token equality only in search (`igsn = upper(token)`); a partial identifier finds nothing ([[sample-search]]).
