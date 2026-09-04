# 0035. Service accounts

Date: 2026-09-04

## Status

Accepted.

## Context

External services will read a subset of samples through a future machine API. A super admin declares those services now: a service account named after the service, attached to an institutional group (organisme and laboratory required, OSU optional, like a user's own trio), and managing institutional and/or manual groups. Its sample reach must equal a space manager's over the same groups, but it never reaches the admin app as a user and never counts as a human manager.

## Decision

**A service account is its own table, never a flagged `user` row.**

- `service_account(id, name, institutional_organization, institutional_osu, institutional_laboratory, created_at)`, unique index on `lower(name)` like `manual_group`.
- `service_account_managed_institutional_group` and `service_account_managed_manual_group`, mirroring the user manager tables (`user_managed_institutional_group`, `user_managed_manual_group`).

### Rejected: a flagged `user` row

A user row would need:

- A synthetic unique email to satisfy the `user` table's constraints.
- Six exclusion filters to add and keep: `/admin/users`, `/admin/users/search`, the pending digest, `listSpaceManagers`, manager counts, and group manager lists.
- A guard against colliding with `currentUser`'s email-upsert on login.

A separate table keeps every user query untouched and matches the "keep them apart" decision.

### Fields

- `name`: unique case-insensitively, a 409 `name_taken` on conflict, matching `manual-group/repository.ts`.
- The institution trio: organisme and laboratory required, OSU optional, validated by `serviceAccountBodySchema` reusing `institutionalGroupIssues` from `institutional-group/institutional-groups-validator.ts`.
- `managedGroups`: `managedGroupsSchema`, the same shape a user's managed groups use.

### Kept apart from human managers (PO decision)

- Never listed on a group's manager page.
- Never counted as an active manager.
- Never mailed (no orphan-group digest, no pending-users recap).

### Reach for the future API

`managerScope(account.id, account.managedGroups)` (`domain/user/moderation-scope.ts`) feeds `moderatedSampleWhere` (`api/src/sample/service/moderated-sample-where.ts`), both already pure over a `ModerationScope` and left untouched by this ticket.

### Credential deferred (PO decision)

No secret column, no Keycloak change. `docs/gaiadata-client-provisioning.md`'s "service accounts OFF" on the admin SPA's Keycloak client is unaffected: these accounts authenticate through neither Keycloak nor OIDC in this ticket.

### Routes and admin section

- `packages/api`: `/admin/service-accounts` mounted super-admin-only (`requireSuperAdmin`), mutations also behind `requireActiveSession`.
- `packages/admin`: a `/service-accounts` section behind `SuperAdminOnly`, with its own nav entry.

## Consequences

- Deleting a manual group cascades its managed rows in `service_account_managed_manual_group`, same as it already does for users.
- A catalog regeneration (`sync-institutions.ts`) that drops a stale institutional code is read leniently through `knownManagedCodes`, so a service account managing a now-unknown code does not break.
- The shared `ManagedGroupsFields` component (extracted from `user-form.tsx`) now serves both the user form and the service-account form: no second copy of the four managed-group pickers.
