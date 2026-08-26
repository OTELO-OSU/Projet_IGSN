# 0031. Public contributor identities

Date: 2026-08-26

## Status

Accepted.

## Context

- The PO asked for a "share my samples" link a researcher hands out, landing on the public sample list prefiltered to their own samples.
- That needs a public, per-person filter. Until now nothing about a user was public: `/admin/users` and `/admin/currentUser` sit behind auth, and the public sample list carried no notion of who owns or contributed to a sample.

## Decision

- Names of accepted users become public, but only once they hold a published sample: `GET /users` lists accepted users linked, through any `user_sample` role, to at least one published sample.
- `?include=<uuid>` appends one accepted user by uuid regardless of publication, the escape hatch that lets a user whose samples aren't published yet still see and share their own filter set to their own name.
- Email, orcid and status never appear in the response; a pending or rejected user is never listed, `include` included.
- The new `contributor` sample facet filters by an `EXISTS` on `user_sample` whatever the role, so a co-author or editor narrows the list the same as the owner.

## Rejected alternatives

- Listing every accepted user, not just publishing ones: requested first, dropped for privacy, an account with no published sample has no reason to be publicly named.
- A per-user `GET /users/:id`: one more endpoint for the same lookup the list already needs for the picker; `include` folds both into one call.

## Consequences

- The registry now has a public user directory, bounded by publication: a name appears only as long as it is attached to at least one published sample.
- Publishing a sample makes its owner, editors and contributors' names public, alongside the sample itself.
- A user's DB `id` is a public identifier by design: it appears in shareable URLs (`?contributor=<id>`) and is returned to the admin (`currentUserSchema.id`) to build that link.
