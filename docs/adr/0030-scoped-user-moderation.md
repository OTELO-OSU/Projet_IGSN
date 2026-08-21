# 0030. Scoped user moderation (space manager)

Date: 2026-08-20

## Status

Accepted.

## Context

- ADR 0023 made `/admin/users` super-admin-only, so an unavailable super admin blocked every pending researcher.
- The PO asked for a delegated role, "Gestionnaire d'espaces" (space manager), moderating a subset of users without full super-admin power.

## Decision

**The role is a non-empty scope, not a flag.** No column and no Keycloak claim carry it: a user is a space manager exactly when `isSpaceManager` finds one managed code, so clearing every picker demotes them in the same save, with no 422.

**One table**, `user_managed_institutional_group(user_id, kind, code)`, with no FK on the code, since the institutional catalogs are TypeScript data, not rows.

**One match rule**: a target is in scope if its recorded `institutional_laboratory` is covered by the scope expanded to laboratory codes (`managedLaboratoryCodes`). The right derives from the group managed, never from the target's own recorded organisme. A managed organisme grants every laboratory it holds, so it grants its OSUs whole, including their laboratories held only by another organisme.

**Scoping lives only in SQL**, in `api/src/user/moderation-scope-where.ts`, threaded into `list`, `get`, and `update`'s `FOR UPDATE` pre-image so they cannot drift apart. A super-admin scope runs unfiltered; a scope managing nothing compiles to a `false` literal, never a dropped `WHERE`. The clause also excludes `id = callerId` and every `super_admin = true` row.

**Every moderating caller carries a `ModerationScope`** (`callerId`, `superAdmin`, `groups`), so no reader has to read an absent scope as "super admin".

**Only a super admin grants the role**, and only a super admin moves a user in and out of a manual group.

**A manager edits only the fields of the kind it manages**, per `domain/user/user-management-rights.ts`, read by the api (`api/src/user/permitted-user-update.ts`) and by the admin form, which disables the rest.

| Caller              | status | institutions | manual groups | managed groups |
| ------------------- | ------ | ------------ | ------------- | -------------- |
| super admin         | yes    | yes          | yes           | yes            |
| institution manager | yes    | yes          | no            | no             |

**A field the caller holds no right on keeps its stored value.** `permittedUserUpdate` folds the rights into the values actually written, so an out-of-scope change is dropped rather than refused: one 403 for a target out of reach, none for a field out of reach.

**The institutional right stops at the managed laboratories**, so `userManagementRights` takes the caller and the target, granting `status` and `institutions` only when the target's recorded laboratory is in the caller's `managedLaboratoryCodes`; a target with no recorded laboratory is out of reach. An institution manager may move a user out of its own reach, mirroring the auto-demote stance.

**Three independent scope pickers** (organismes, OSUs, laboratories) with no cascade, unlike the cascading `institutional-groups-fields.tsx`: a manager's reach is a union of independent picks (PO decision). Search by identifier folds it into the option label (`managed-group-items.ts`) rather than changing the shared `MultiCombobox`.

**Stored codes are read leniently**: `knownManagedCodes` drops a code a catalog regeneration removed rather than 500ing a session load, while `managedGroupsSchema` stays strict on write. A manager whose whole scope was retired silently loses the role.

**`currentUser` carries `managed: { laboratories }`**, not a `spaceManager` boolean, since the admin form needs the expanded laboratory reach to disable fields per target. The expansion stays server-side in `managedLaboratoryCodes`.

## Alternatives rejected

- A `space_manager` boolean column with its own non-empty-scope invariant: duplicates what the scope already expresses.
- Refusing the save when a super admin clears a manager's last managed group: the PO chose silent auto-demote.
- 403ing a manager that submits a field it may not write, compared round-trip against the stored row: the PO chose to keep the stored value instead, which drops the guard and its comparison helpers.
- An optional scope, absent for a super admin: every reader then re-derived "super admin" from a missing argument.

## Consequences

- ADR 0023 predicted a new role would widen `canPublishSamples` and the ownership override; this one widens `/admin/users` reach instead, touching neither.
- A catalog regeneration dropping a code silently demotes a manager, mirroring the "no email is sent" stance for status changes.
- One function builds the where-clause and three queries consume it, so a fourth caller adds a call, never a second copy.
- `GET /admin/currentUser` reads the caller's scope on every call, since the role is derived: one extra query for every authenticated user.
- The admin form silently discards a change a manager may not write, so a field it cannot edit must be disabled or the save looks lost.
