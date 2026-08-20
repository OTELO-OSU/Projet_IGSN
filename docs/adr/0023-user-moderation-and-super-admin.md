# 0023. User moderation and super admin

## Status

Accepted

## Context

ADR 0019 gave every researcher an owned space but no gate: any Keycloak account could sign in and publish immediately. The registry needs a moderation step, an admin accepting or rejecting a new researcher before their samples go public, and a small operator role that can see and fix any sample, not just its own.

## Decision

**Status lives on the `user` row.** `status` (`pending` | `accepted` | `rejected`), default `pending`, set by `currentUser`'s provisioning upsert (ADR 0019). A pending user can draft but not publish, a rejected one is locked out entirely, and an accepted one behaves as before this ticket.

**Publish gating is `canPublishSamples(user)`**: `status === "accepted" || superAdmin`. It runs server-side in `requireSampleAccess`, method-scoped so a GET never trips it: draft PUT and publish are gated, and writing to a published sample's fields or attachments counts as publishing again and needs the same right. The admin UI mirrors the check to disable the button and show the tooltip, but the API is the boundary.

**Rejected users are locked out in `currentUser`**, the middleware every authenticated route already passes through: one guard, no per-route duplication, and it 403s rather than 401s so the SPA's silent-renew-then-redirect retry (ADR 0006) never loops on an account that will never become valid again.

**Super admin is a local DB boolean (`user.super_admin`), not a Keycloak realm role.** The realm is GaiaData's, shared with other service providers we do not administer, so we cannot ask it to carry our role; `requireRole` (built in ADR 0006) stays unused for this reason and is the rejected alternative. The flag is never token-derived: no request claim sets it and no endpoint accepts it as input (`updateUserSchema` is a `strictObject` carrying only the status, the institutional trio and the manual groups), so it can only change by direct database write.

**Super admin overrides ownership everywhere ownership is checked**, unscoped in the admin sample list and in `requireSampleAccess`, which lets a super admin's request through whatever role the share table holds for them.

**First super admin is a one-off manual write, per environment.** An env-var seed (`SUPER_ADMIN_EMAILS`) was rejected as a standing input the app would keep validating and reconciling on every boot, for a step that happens once per environment. Instead, run once against each environment's database after that person's first sign-in, their row having to exist already:

```sql
UPDATE "user" SET status = 'accepted', super_admin = true WHERE email = '<email>';
```

**`/admin/users` endpoints are super-admin-only**, guarded like every other admin route, and the status change additionally revalidates the live session (`requireActiveSession`, ADR 0006 REQ-CRIT-01) since it is a rights change.

**Two paths lead back to `pending`.** A user changing their own organisme / OSU / labo trio resets their own status, that trio being what a moderator judged when accepting them; resubmitting the same trio, or declaring one for the first time, leaves the status untouched, and a super admin keeps `accepted`, since they moderate others rather than themselves. A super admin's `PUT /admin/users/:id` sets another user's status and trio in one save, writing both through `UserRepository.update` rather than `setInstitutionalGroups`, so that edit is itself the moderation and never re-pends its target; `settableUserStatuses` then bounds it to putting an account back to `pending` only while it is still `pending`, never after a decision.

**Status changes propagate on reconnect only.** The signed-in user's own status and role are read once via `/admin/currentUser` and cached with `staleTime: Infinity`, so nothing pushes a moderation decision to an open tab and a user moderated mid-session keeps their prior banner and publish state until a re-fetch. PO decision, moderation being rare and not time-critical: no websocket, no polling, no cache invalidation.

## Consequences

- No email is sent on any status change (out of scope), so a moderated user only learns their status by loading the app.
- The super admin flag has no UI or endpoint to grant it: promoting a second super admin is the same manual `UPDATE`, recorded in [preprod-deploy.md](../preprod-deploy.md).
- `requireRole`/`realm_access.roles` stays built but unused; revisit if GaiaData ever lets us manage a realm role for this registry.
- The weekday `listPending` digest sweeps the `pending` column, so an account demoted by either path reaches the same super admins with no extra work. It reports and orders by `created_at`, so a demoted account shows its signup age and sorts above genuine newcomers; a re-pending timestamp is deferred until a moderator complains.
- Adding a role beyond owner and super admin (a moderator who is not a full super admin) means widening `canPublishSamples`'s and the ownership override's inputs; the `user` row already has room for a second boolean or a role enum, so no schema rework is expected.
