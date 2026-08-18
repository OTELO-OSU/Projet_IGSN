# 0023. User moderation and super admin

## Status

Accepted

## Context

ADR 0019 gave every researcher an owned space but no gate: any Keycloak
account could sign in and publish immediately. The registry needs a
moderation step (an admin accepts or rejects a new researcher before their
samples go public) and a small operator role that can see and fix any
sample, not just its own.

## Decision

**Status lives on the `user` row.** `status` (`pending` | `accepted` |
`rejected`), default `pending`, set by `currentUser`'s provisioning upsert
(ADR 0019). A pending user can draft but not publish; a rejected one is
locked out entirely; an accepted one behaves as before this ticket.

**Publish gating is `canPublishSamples(user)`**: `status === "accepted" ||
superAdmin`. It runs server-side in `requireSampleAccess`
(`packages/api/src/sample/require-sample-access.ts`), method-scoped so a GET
never trips it: draft PUT and publish are gated, and writing to a published
sample's fields or attachments (POST/DELETE) counts as publishing again and
needs the same right. The admin UI mirrors the same check to disable the
button and show the tooltip, but the API is the actual boundary.

**Rejected users are locked out in `currentUser`**, the middleware every
authenticated route already passes through: one guard, no per-route
duplication, and it 403s rather than 401s so the SPA's silent-renew-then-
redirect retry (ADR 0006) never loops on an account that will never become
valid again.

**Super admin is a local DB boolean (`user.super_admin`), not a Keycloak
realm role.** The realm is GaiaData's, shared with other service providers
we don't administer (ADR 0006 amendment); we cannot ask it to carry our
role. `requireRole` (built in ADR 0006 as a `realm_access.roles` guard) stays
unused for this reason and is the rejected alternative. The flag is never
token-derived: no request claim sets it, and no endpoint accepts it as
input (`updateUserSchema` is a `strictObject` carrying only the status, the
institutional trio and the manual groups). It can only change by direct
database write.

**Super admin overrides ownership everywhere ownership is checked**:
unscoped in the admin sample list (no `user_sample` filter) and in
`requireSampleAccess`, which lets a super admin's request through whatever
role the share table holds for them. This supersedes part of ADR 0019's "ownership is enforced
in two places" wording, see the note added there.

**First super admin is a one-off manual write, per environment, no
env-var promotion.** An env-var seed (e.g. `SUPER_ADMIN_EMAILS`) was
considered and rejected: it is a standing input the app would need to keep
validating and reconciling on every boot, for a step that happens once per
environment. Instead:

```sql
UPDATE "user" SET status = 'accepted', super_admin = true WHERE email = '<email>';
```

run once against each environment's database after that person's first
sign-in (their row must already exist). Recorded in
[preprod-deploy.md](../preprod-deploy.md).

**`/admin/users` endpoints are super-admin-only**, guarded the same way as
every other admin route, and `PUT /users/:id/status` additionally revalidates
the live session (`requireActiveSession`, ADR 0006 REQ-CRIT-01) since it is a
rights change.

**Status changes propagate on reconnect only.** The signed-in user's own
status/role is read once via `/admin/currentUser` and cached with
`staleTime: Infinity` (`packages/admin/src/auth/use-current-user.ts`); nothing pushes a moderation decision
to an open tab. A user moderated mid-session keeps their prior banner/publish
state until their next sign-in or token refresh cycle re-fetches it. PO
decision: acceptable given moderation is rare and not time-critical: no
websocket, no polling, no cache invalidation added for this.

## Consequences

- No email is sent on any status change (out of scope); a moderated user
  only learns their status by loading the app.
- The super admin flag has no UI or endpoint to grant it beyond the initial
  write; promoting a second super admin is the same manual `UPDATE`.
- `requireRole`/`realm_access.roles` stays built but unused; if GaiaData ever
  lets us manage a realm role for this registry, revisit moving the flag
  there.
- Adding a role beyond owner/super-admin (e.g. a moderator who isn't a full
  super admin) means widening `canPublishSamples`'s and the ownership
  override's inputs; the `user` row already has room (a second boolean or a
  role enum), no schema rework expected.

## Amendment 2026-08-17: a second path back to `pending`

"`pending`... is not reachable again" above no longer holds. Ticket 115 made
`PUT /admin/currentUser/institutional-groups` repeatable, and a change of the
organisme / OSU / labo trio now resets the caller's own `status` to
`pending`, since that trio is what a moderator judged when accepting them. A
super admin keeps their `accepted` status: they moderate others, not
themselves. Resubmitting the same trio updates no row, so an identical save
leaves the status untouched, and a first declaration keeps it too: an account
with no trio yet was never judged on one.

No admin-facing path back to `pending` was added by ticket 115; this ticket
adds one. `PUT /admin/users/:id` lets a super admin set another user's status
and trio in one save, writing both through `UserRepository.update` rather than
`setInstitutionalGroups`, so the `pending`-on-change case above never applies:
the super admin's edit is itself the moderation, so it does not re-moderate its
target. Only `settableUserStatuses` bounds the status, so a super admin can put
an account back to `pending` only while it is still `pending`, never after a
decision. The weekday `listPending` digest (`send-pending-users-digest`)
already sweeps the `pending` status column, so an account demoted this way
reaches the same super admins with no extra work. It reports and orders by
`created_at`, so such an account shows its signup age, not the time since the
change, and sorts above genuine newcomers; a re-pending timestamp is deferred
until a moderator complains.
