---
type: auth
title: Local user store and sample ownership
description: >-
  A local user table keyed by email, provisioned just in time from verified
  claims behind an IdP allow-list, with ownership in user_sample enforced
  server-side.
resource: packages/api/src/user/current-user.ts
tags:
  - auth
  - user
  - authz
relations:
  - type: depends_on
    target: auth-keycloak-gaiadata
  - type: depends_on
    target: kysely-dbal
status: stable
---

Keycloak knows the people but cannot hold registry data, so the api keeps a local `user` table (`id`, `email` unique, `name`, `firstname`, `orcid`, `status`, `super_admin`, the three institutional codes) and a `user_sample` join table (`user_id`, `sample_id`, `role`, composite primary key). One sample can have several users and one user several samples.

- **Email is the identity key**, but only once the login passes an identity-provider allow-list. `currentUser` runs right after `requireAuth` on the `/admin` mount: it checks `identity_provider` (eduGAIN as `satosa`, and ORCID, are the only providers listed), then upserts the caller by email from the verified claims (`email`, `given_name`, `family_name`) just in time. A token from any other provider, or with no such claim, provisions nothing and is refused 403 with `unsupported_identity_provider`; there is deliberately no super-admin bypass. A token without an `email` claim is 403 too, since it cannot own anything.
- The ORCID branch runs before the email upsert ([[orcid-linking]]).
- **Ownership is enforced in two places, both server-side.** The admin list is scoped to the caller in SQL (an `exists` on `user_sample`, in the page and the count queries), and `requireSampleAccess` guards every admin route naming a sample id, reads and writes alike.
- **One read decides 200, 403 and 404.** `getSample` returns the row plus the caller's role (a left join on `user_sample`, no second query): no row is a 404, no role is 403, and a guarded route never re-reads the sample. It also computes `managed` and `moderating` for [[space-manager-scope]].
- Ownership survives the first sign-in of a seeded owner, the upsert adopting the row already carrying that email, which is what lets the dev and e2e seeds own data.
- A researcher whose email changes at the IdP gets a fresh, empty account; that is the cost of email-keying. Adding `sub` alongside email is a one-column migration.
- Roles and collaborators: [[per-sample-roles]]. Account moderation: [[user-moderation-super-admin]].
