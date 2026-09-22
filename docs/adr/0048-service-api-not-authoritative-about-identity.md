# 0048. `/service` is never authoritative about identity

Date: 2026-09-22

## Status

Accepted. Amends ADR [0036](0036-service-account-api-key.md). Superseded in part by ADR [0049](0049-person-orcid-from-linked-account-only.md), which changes the Consequences below.

## Context

A sample person is either a link to a registry account (`*UserId`) or a typed name, never both (`domain/sample/contact-link.ts`). `/service` is a key-authenticated machine mount with no session, so it has no way to tell one registered person from another beyond the name a caller sends.

## Decision

`/service` can add, change and remove people on a sample, but it can neither grant nor revoke an account link.

- `coreSampleBodySchema` refuses a body carrying a `userId` anywhere (`unrecognized_keys`): a `POST` or `PUT` never creates or targets a link directly.
- On write, a submitted person's name is matched only against links the sample already holds (`restoreRowLinks`/`sameRow` in `contact-link.ts`). A match restores that existing link. No match stores the person as a typed name; the person is never dropped.
- A name matching nothing stored is never linked to any account, matched or not: linking on a bare name match would link two homonyms' samples to the same account.
- `GET` answers a linked person's name resolved live from the account, never the account link (`userId`) itself.

## Consequences

- `keepContactLinks` now matches incoming and stored rows on content (role, name, ~~ORCID~~) rather than array index, so a reordered or shortened `additionalRoles[]` still keeps the right rows' links. ORCID dropped from that match by ADR 0049: a stored row's ORCID is account-resolved and a submitted payload never carries one.
- A `/service` caller cannot discover or forge an account link; every read and write treats the sample's own recorded name as the fact and a stored link as an internal detail it may only preserve, never set.
