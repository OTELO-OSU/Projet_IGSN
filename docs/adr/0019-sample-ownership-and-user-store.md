# 19. Sample ownership and the local user store

Date: 2026-07-27

## Status

Accepted. The role column and the sharing/removal question flagged in
Consequences below are addressed by ADR 0021 (per-sample contributor role).

## Context

Until now `/admin/*` only checked that a Keycloak token was valid: every
authenticated researcher saw and edited every sample, and no sample recorded who
declared it. The registry needs the opposite default, since a declaration is the
work of the researcher who made it.

Two things were missing: local user rows to point ownership at, and a per-sample
authorization rule. Keycloak knows the people but cannot hold registry data, and
there is no user-management UI yet, so accounts can only appear from the tokens
themselves.

## Decision

A `user` table (`id`, `email` unique, `name`, `firstname`) and a `user_sample`
join table (`user_id`, `sample_id`, composite primary key). One sample can have
several users and one user several samples. No role column: for now a row means
owner, and the creator of a sample is its owner.

**Email is the identity key.** `currentUser` runs right after `requireAuth` on
the `/admin` mount and upserts the caller by email from the verified claims
(`email`, `given_name`, `family_name`), just-in-time. A token without an `email`
claim is answered 403: it cannot own anything.

**Ownership is enforced in two places, both server-side.** The admin list is
scoped to the caller in SQL (an `exists` on `user_sample`, in the page _and_
count queries), and `requireSampleOwner` guards every admin route naming a
sample id, reads and writes alike.

**One read decides 200, 403 and 404.** `getSample` returns the row plus whether
the caller owns it (a left join on `user_sample`, no second query), and the guard
hands the sample it fetched to the route: no row is the route's own 404, an
unowned row is 403, and a guarded route never reads the sample again. A sample
nobody owns is forbidden to everyone.

Public routes are untouched: the frontend keeps serving published samples to
anonymous readers.

## Consequences

- Ownership survives the first sign-in of a seeded owner: the upsert adopts the
  row that already carries that email, keeping the samples assigned to it. This
  is what makes the dev and E2E seeds able to own data.
- A researcher whose email changes at the IdP gets a fresh, empty account. That
  is the cost of email-keying, accepted while the registry has no way to
  reassign owners.
- ADR 0006's `sub`-keyed store (REQ-OIDC-01) and IdP deletion propagation
  (REQ-USER-01) are not delivered here. Keycloak mints `sub` at first broker
  login, so a `sub`-keyed store cannot pre-provision an owner, and the rejected
  alternative (seed a placeholder `sub`) breaks the moment the real account
  arrives. Adding `sub` alongside email is a one-column migration, to land with
  user management.
- Samples predating this change have no owner row and are unreachable in admin
  until assigned. Only demo data is affected; `make db-seed-demo` re-seeds it.
- Adding, removing, or editing owners, other roles, and an admin override are all
  still to come. The join table shape does not have to change for them, only the
  role column. **Update (ADR 0021):** the role column landed (`owner |
contributor`), with sharing but not removal; editing owners and an admin
  override are still open.
