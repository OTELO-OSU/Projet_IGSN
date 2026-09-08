---
type: domain-model
title: Service accounts
description: >-
  A super-admin-declared non-human account with a name, a required owner,
  an institutional trio and managed groups, its own table never a user
  row, with an owner-rotated API key for the `/service` machine mount.
resource: packages/api/src/service-account
tags:
  - domain
  - groups
  - authz
relations:
  - type: depends_on
    target: institutional-groups
  - type: depends_on
    target: manual-groups
  - type: depends_on
    target: space-manager-scope
status: stable
---

A service account is a named stand-in for an external service that a machine API lets call in a researcher's name. A super admin declares it, but a researcher asks for one and owns it.

- **Its own table**, `service_account` plus `service_account_managed_institutional_group` and `service_account_managed_manual_group`, mirroring the user manager tables. Not a flagged `user` row: that would need a synthetic unique email and six exclusion filters across `/admin/users`, search, the pending digest, `listSpaceManagers`, manager counts and group manager lists. See `docs/adr/0035-service-accounts.md`.
- **Fields**: a unique name (case-insensitive, 409 `name_taken`), a required `owner` (`owner_id`, FK to `user`, cascades on delete), the institution trio (organisme and laboratory required, OSU optional, same shape as a user's own trio), and `managedGroups`.
- **Kept apart from human managers**, a product-owner decision: never listed on a group's manager page, never counted as an active manager, never mailed.
- **Its sample reach** is the same `managerScope(id, managedGroups)` fed to `moderatedSampleWhere` a space manager already uses, both untouched by this feature.
- **Request flow**: an accepted, signed-in frontend user opens "Ask for a service account" from the public footer, names it, states a reason and picks groups from their own trio and their attachable manual groups (memberships plus managed groups, [[manual-groups]]); `POST /admin/currentUser/service-accounts/requests` answers 422 for a group outside that set, mails every super admin the reason plus a prefilled `/service-accounts/create?request=<json>` link that omits the reason, the requester becoming the owner.
- **Credential**: a 256-bit random key, stored as its SHA-256 hex digest, shown once. Only the owner generates or rotates it, from the admin Settings "Services" section; a super admin gets no key button. See `docs/adr/0036-service-account-api-key.md`.
- **`/service`** is the resulting machine mount, guarded by `requireServiceAccount` and IP rate-limited; `GET /service/ping` is its first route, answering `{ ok: true }` for a valid key and 403 for a missing or unknown one.
- Managed from a super-admin-only `/admin/service-accounts` API mount and a `/service-accounts` admin section, both gated the same way as other super-admin-only areas; the owner's own accounts and key also reach through `/admin/currentUser/service-accounts`.
- The admin's `ManagedGroupsFields` component, extracted from the user form, now serves both the user form and the service-account form: one set of managed-group pickers, fed from `domain/institutional-group/managed-group-items.ts`, shared with the frontend request form.
