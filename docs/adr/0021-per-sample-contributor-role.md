# 21. Per-sample contributor role

Date: 2026-08-03

## Status

Accepted. Supersedes the "still to come" paragraph of ADR 0019's Consequences
(role column, adding/removing collaborators).

## Context

ADR 0019 gave every sample exactly one owner and left "adding, removing, or
editing owners, other roles, and an admin override" for later. The PO asked
for the first of those: an owner shares a draft with another researcher, who
can edit it but not publish it or share it further.

## Decision

**`role` on `user_sample`, not a new table.** `role` (`owner | contributor`,
no default, `CHECK (role in ('owner', 'contributor'))`) on the existing join
row. The migration
(`packages/api/migrations/20260731144205-add-user-sample-role.ts`) adds it
nullable, backfills every existing row to `owner` (every link predating this
change was ownership), then sets it `NOT NULL`. No default: every insert
states the role it means, so a future insert that forgets the role fails
loud instead of silently minting an owner.

**At most one owner, enforced by the database.** A partial unique index,
`user_sample_one_owner`, is unique on `sample_id` where `role = 'owner'`. It
enforces _at most_ one, not _at least_ one: nothing stops a sample from
having zero owners, and nothing today deletes users (`user_sample.user_id`
is `ON DELETE CASCADE`, unused). `withSampleOwners`
(`packages/api/src/sample/service/with-sample-owners.ts`) assumes exactly one
owner per sample and throws if it finds none. When user
deletion/moderation (REQ-USER-01) lands, reassign ownership in the same
transaction as the delete, or a contributor's admin list 500s on the sample
the deleted user owned.

**Contributor capability: edit drafts only.** `canUpdateSample`
(`packages/domain/src/user-sample/can-update-sample.ts`) is the one function
every write route calls: `role === "owner" || (role === "contributor" &&
!sample.published)`. A contributor loses write access the moment a sample
publishes; only the owner can publish, share, or edit a published sample.

**Sharing is owner-only, and adding a contributor is the guard's first
production caller of `requireActiveSession`.** `POST
/admin/samples/:id/contributors` requires both `role === "owner"` (checked in
the route, same as `GET .../contributors`) and a live Keycloak session
(`packages/api/src/auth/active-session.ts`), since granting write access to
someone else is exactly the destructive/rights-granting action that guard was
built for. It calls `/userinfo` with the caller's token; a locally-valid but
revoked JWT is rejected even inside its token lifespan. The endpoint looks up
the invitee by email/name through `GET /admin/users?search=`, which is why
that search had to exist at all: it is the only way an owner finds another
researcher's account to grant against, since there is no other user
directory in the admin app. `OIDC_USERINFO_URI` overrides the issuer-derived
default in `docker-compose.dev.yml` and `docker-compose.e2e.yml` (Keycloak on
the internal compose network); preprod has no override and derives it from
`OIDC_ISSUER`, the SSO stack from ADR 0006.

**Removal is deferred, deliberately.** A contributor grant is irrevocable
except by a manual `DELETE FROM user_sample` in SQL: there is no unshare
route. The PO scoped this ticket to sharing, not un-sharing, and accepted
that gap rather than wait for it. Read this paragraph as the record of that
choice, not an oversight; a follow-up ticket owns the removal route when the
PO asks for it.

**One server-side guard authorizes every route naming a sample id.**
`requireSampleAccess` (`packages/api/src/sample/require-sample-access.ts`)
already existed per ADR 0019; it now also exposes the caller's `role` on
the sample (`owner`, `contributor`, or `null` for "no relationship", answered
403). Routes that differ by role (`canUpdateSample`, the owner-only publish
and contributor routes) branch on that one value; no route re-derives access
from scratch.

**`editor` is an anticipated third role, not built.** The PO confirmed a
future `editor` role (validates declarations, edits after validation, per
the personas in `CLAUDE.md`) is coming but out of scope here. Adding it
later costs: extend the migration's `CHECK` constraint (a new migration,
`CHECK (role in ('owner', 'contributor', 'editor'))`), extend
`UserSampleRole` in `packages/domain/src/user-sample/model.ts`, and extend
`canUpdateSample` and any other role switch. The one-owner unique index does
not need to change: it is scoped to `role = 'owner'` and ignores other role
values.

**User search discloses name and email to any authenticated researcher.**
`GET /admin/users?search=` (`packages/api/src/user/routes.ts`) is reachable
by anyone who reaches `/admin`, not just sample owners, since the guard
lives on the sample route, not the user directory. The PO accepted this as
a known, bounded risk: it is a directory lookup restricted to people who
already cleared the OIDC login, not an open enumeration endpoint. The query
term is optional: with no term the endpoint browses the first 20 users
ordered by email (`BROWSE_LIMIT`), so the share dialog can list colleagues
before any typing; the caller is always excluded from the results.
Mitigations in place: a 2-character minimum and `MAX_SEARCH_LENGTH` ceiling
on a provided term
(`packages/api/src/user/validator.ts`, `packages/domain/src/sample/search/search-tokens.ts`),
a hard cap of 10 results per filtered query (`SEARCH_LIMIT`,
`packages/api/src/user/search-users.ts`) and 20 per browse, and the existing
per-user rate limit on the whole `/admin` mount (100 requests/60s, ADR 0020)
rather than a search-specific one. The browse branch widens nothing: a
2-character substring already reached every row within the rate budget; it
only lowers the cost of the first 20.

## Consequences

- Adding a contributor to a draft, then publishing it, silently revokes that
  contributor's write access without notifying them; only the owner is told
  (implicitly, by regaining sole write access). Acceptable for a first cut;
  a notification is a separate ticket.
- Since 2026-08-07, being added does send an invitation mail naming the
  inviter and the sample (`packages/api/src/user-sample/sample-invitation-mail.ts`);
  a re-add sends nothing, and losing access on publication still notifies nobody.
- Un-sharing, an editor role, and an admin override remain open, same as ADR
  0019 left them. This ADR narrows that list by one (sharing/roles landed)
  and hands the rest, plus the removal gap it introduces, to future tickets.
- The zero-owner case (department this ADR does not close) stays latent
  until REQ-USER-01 ships; there is no code path today that produces it
  outside a manual SQL delete of the owner's `user_sample` row.
