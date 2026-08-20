# 0019. Sample ownership and the local user store

Date: 2026-07-27

## Status

Accepted, then extended twice. ADR 0024 added the `role` column and the collaborator sharing and removal this ADR deferred. ADR 0023 added moderation status, the user-management UI whose absence the Context below describes, and a super admin reaching every sample regardless of `user_sample`, so "a sample nobody owns is forbidden to everyone" no longer holds for that role.

## Context

`/admin/*` only checked that a Keycloak token was valid: every authenticated researcher saw and edited every sample, and no sample recorded who declared it. The registry needs the opposite default, since a declaration is the work of the researcher who made it.

Two things were missing: local user rows to point ownership at, and a per-sample authorization rule. Keycloak knows the people but cannot hold registry data, and with no user-management UI, accounts could only appear from the tokens themselves.

## Decision

A `user` table (`id`, `email` unique, `name`, `firstname`) and a `user_sample` join table (`user_id`, `sample_id`, composite primary key). One sample can have several users and one user several samples. No role column: a row means owner, and the creator of a sample is its owner.

**Email is the identity key.** `currentUser` runs right after `requireAuth` on the `/admin` mount and upserts the caller by email from the verified claims (`email`, `given_name`, `family_name`), just in time. A token without an `email` claim is answered 403, since it cannot own anything.

**Ownership is enforced in two places, both server-side.** The admin list is scoped to the caller in SQL (an `exists` on `user_sample`, in the page and the count queries), and `requireSampleAccess` guards every admin route naming a sample id, reads and writes alike.

**One read decides 200, 403 and 404.** `getSample` returns the row plus whether the caller owns it (a left join on `user_sample`, no second query), and the guard hands the sample it fetched to the route: no row is the route's own 404, an unowned row is 403, and a guarded route never reads the sample again.

Public routes are untouched: the frontend keeps serving published samples to anonymous readers.

## Consequences

- Ownership survives the first sign-in of a seeded owner, the upsert adopting the row that already carries that email, which is what lets the dev and e2e seeds own data.
- A researcher whose email changes at the IdP gets a fresh, empty account. That is the cost of email-keying, accepted while the registry has no way to reassign owners.
- ADR 0006's `sub`-keyed store (REQ-OIDC-01) and IdP deletion propagation (REQ-USER-01) are not delivered here. Keycloak mints `sub` at first broker login, so a `sub`-keyed store cannot pre-provision an owner, and the rejected alternative of seeding a placeholder `sub` breaks the moment the real account arrives. Adding `sub` alongside email is a one-column migration.
- Samples predating this change have no owner row and are unreachable in admin until assigned. Only demo data is affected, and `make db-seed-demo` re-seeds it.

## Amendment 2026-08-12: email keys only an allow-listed login

"Email is the identity key" now holds only once the login has passed an identity-provider allow-list. A token from any provider outside it, or with no `identity_provider` claim at all, provisions no row and is refused 403 with a `reason` code (`unsupported_identity_provider`), the email upsert never running for it. eduGAIN (brokered as `satosa`) and ORCID are the only providers on the list.

The check runs in `currentUser` before the user lookup, so there is deliberately no super-admin bypass: the allow-list applies to every caller. A row already provisioned from a now-refused provider is left as is rather than migrated away; it can no longer authenticate, and a super admin can reject it from `/users` (ADR 0023) like any other unwanted account.

ADR 0020's ORCID branch, resolving strictly by the stored `orcid` column, is unchanged; it is now reached only after a login has passed the allow-list.
