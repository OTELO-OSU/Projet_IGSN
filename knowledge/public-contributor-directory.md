---
type: feature
title: Public contributor identities
description: >-
  GET /users publicly names accepted users holding a published sample, powering
  a shareable per-person filter on the public list.
resource: packages/api/src/user/public-routes.ts
tags:
  - public-contract
  - user
  - search
  - privacy
relations:
  - type: depends_on
    target: search-facets
  - type: depends_on
    target: user-moderation-super-admin
status: stable
---

A researcher hands out a "share my samples" link landing on the public sample list prefiltered to their own samples, which needs a public per-person filter.

- `GET /users` lists accepted users linked, through any `user_sample` role, to at least one published sample. So a name appears only as long as it is attached to a published sample, and publishing makes the owner, editors and contributors public alongside the sample.
- `?include=<uuid>` appends one accepted user by uuid regardless of publication, the escape hatch letting a user whose samples are not published yet see and share their own filter.
- Email, orcid and status never appear; a pending or rejected user is never listed, `include` included.
- The `contributor` facet filters by an `EXISTS` on `user_sample` whatever the role, so a co-author or editor narrows the list the same as the owner ([[search-facets]]).
- A user's DB `id` is a public identifier by design: it appears in shareable URLs (`?contributor=<id>`) and is returned to the admin (`currentUserSchema.id`) to build that link.
- The public sample detail also names the owner (name and first name, never the email) and lets a visitor email them through the api ([[mail-notifications]]).
