---
type: domain-model
title: Service accounts
description: >-
  A super-admin-declared non-human account with a name, an institutional
  trio and managed groups, its own table never a user row, for a future
  machine API's sample reach.
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

A service account is a named stand-in for an external service that a future machine API will let read a subset of samples. A super admin declares it now; the credential and the API itself are deferred.

- **Its own table**, `service_account` plus `service_account_managed_institutional_group` and `service_account_managed_manual_group`, mirroring the user manager tables. Not a flagged `user` row: that would need a synthetic unique email and six exclusion filters across `/admin/users`, search, the pending digest, `listSpaceManagers`, manager counts and group manager lists. See `docs/adr/0035-service-accounts.md`.
- **Fields**: a unique name (case-insensitive, 409 `name_taken`), the institution trio (organisme and laboratory required, OSU optional, same shape as a user's own trio), and `managedGroups`.
- **Kept apart from human managers**, a product-owner decision: never listed on a group's manager page, never counted as an active manager, never mailed.
- **Its future sample reach** is the same `managerScope(id, managedGroups)` fed to `moderatedSampleWhere` a space manager already uses, both untouched by this feature.
- **No credential in this ticket**: no secret column, no Keycloak change. The admin SPA's Keycloak client keeps "service accounts OFF"; these rows never authenticate through Keycloak.
- Managed from a super-admin-only `/admin/service-accounts` API mount and a `/service-accounts` admin section, both gated the same way as other super-admin-only areas.
- The admin's `ManagedGroupsFields` component, extracted from the user form, now serves both the user form and the service-account form: one set of managed-group pickers.
