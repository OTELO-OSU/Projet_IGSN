# 0049. A person's ORCID comes from their linked account alone

Date: 2026-09-22

## Status

Accepted. Amends ADR [0048](0048-service-api-not-authoritative-about-identity.md).

## Context

Every sample person field (`chiefScientist`, `collector`, each `additionalRoles[]` row, and the synthesis `operator`) used to accept a hand-typed ORCID alongside a typed name, on top of the existing link-or-typed-name choice. A typed ORCID was never verified: nothing checked it belonged to the typed name, or that it was a real ORCID at all.

## Decision

A person's ORCID on a sample comes from their linked registry account alone. It can never be typed.

- The read model keeps `*Orcid` on every person, resolved live from the linked account, same as the firstname/lastname resolution ADR 0032 already established.
- The write model drops `*Orcid` entirely. A submitted `*Orcid` is silently stripped by Zod rather than rejected, so a caller still sending the field it used to know keeps working instead of failing on a 400.
- `hasTypedContactName` and `sameRow` in `domain/sample/contact-link.ts` stop treating ORCID as part of a typed name or of row identity: a stored row's ORCID is account-resolved and a payload never carries one, so comparing on it would never match.
- The three DB columns (`sc_chief_scientist_orcid`, `sc_collector_orcid`, `syn_operator_orcid`) and `sample_additional_role.person_orcid` are dropped, with no data migration: the registry holds no real deposits yet, and a linked person's ORCID is re-derived from their account on every read.

## Consequences

- `GET /samples/:igsn` and `GET /service/samples/:igsn` still emit `*Orcid`, unchanged: it always came from the account for a link, and a typed ORCID on a sample with no link is simply gone.
- `POST /service/samples` and `PUT /service/samples/:igsn` can no longer record a person's ORCID at all: a caller wanting one recorded must link the person's account instead.
- IGSN Core still emits `agent.id` (the ORCID) as it always did, from the linked account; it is never read back on input, which was already true for a link but is now also true for a typed person.
- A person's `agent.id` stays in the create and update body, described as emit only and ignored on input, the treatment `doi` and `sampleIdentifier` already get. The body is a `strictObject`, so removing it would make a caller resubmitting the payload it just read fail on a 400.
- Amends ADR 0048's Consequences: `keepContactLinks` no longer matches incoming and stored rows on ORCID, since a stored row's ORCID is account-resolved and a submitted payload never carries one; `sameRow` compares role and name alone, excluding every `*Orcid` key.

## Rejected option

Keep accepting a typed ORCID as an unverified string, matched by convention rather than by any registry lookup. Rejected: an unverified ORCID is worse than none, since a reader would reasonably trust it as verified, and every path that already resolves it from a link would need a policy for their disagreement.
