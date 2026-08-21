# 0030. Scoped user moderation (space manager)

Date: 2026-08-20

## Status

Accepted. Amended 2026-08-21, folded in below: a manual group manager curates its groups from the group page, and no detach may drop a member owning a published sample of the group.

## Context

- ADR 0023 made `/admin/users` super-admin-only, so an unavailable super admin blocked every pending researcher.
- The PO asked for a delegated role, "Gestionnaire d'espaces" (space manager), moderating a subset of users without full super-admin power.

## Decision

**The role is a non-empty scope, not a flag.** No column and no Keycloak claim carry it: a user is a space manager exactly when `isSpaceManager` finds one managed code or manual group, so clearing every picker demotes them in the same save, with no 422.

**Two tables**: `user_managed_institutional_group(user_id, kind, code)` and `user_managed_manual_group(user_id, group_id)`. Only the manual-group one has an FK, cascading on delete, since the institutional catalogs are TypeScript data, not rows.

**One match rule**: a target is in scope if its recorded `institutional_laboratory` is covered by the scope expanded to laboratory codes (`managedLaboratoryCodes`), or if it belongs to a managed manual group. The right derives from the group managed, never from the target's own recorded organisme. A managed organisme grants every laboratory it holds, so it grants its OSUs whole, including their laboratories held only by another organisme.

**Scoping lives only in SQL**, in `api/src/user/moderation-scope-where.ts`, threaded into `list`, `get`, and `update`'s `FOR UPDATE` pre-image so they cannot drift apart. A super-admin scope runs unfiltered; a scope managing nothing compiles to a `false` literal, never a dropped `WHERE`. The clause also excludes `id = callerId` and every `super_admin = true` row.

**Every moderating caller carries a `ModerationScope`** (`callerId`, `superAdmin`, `managedLaboratories`, `managedManualGroupIds`), so no reader has to read an absent scope as "super admin".

**A manual group manager curates its groups from the group page**, `/admin/manual-groups` no longer being super-admin-only: the list answers with the managed groups alone, and reading a group, its members, associating and detaching one are open to that group's manager, per `canManageManualGroup`. Creating, renaming and deleting a group stay super admin, so a manager adds a member `/admin/users` cannot reach, its reach being the current members.

**No detach may drop a member owning a published sample of the group**, `detachManualGroupMember` being the single path behind the self-service leave, the group page and `PUT /admin/users/:id`, which answers 409 rather than dropping the change like a field out of reach.

**Only a super admin grants the role.**

**A manager edits only the fields of the kind it manages**, per `domain/user/user-management-rights.ts`, read by the api (`api/src/user/update-user-status-and-institutions.ts`, and `canManageManualGroup` per group) and by the admin form, which disables the rest.

| Caller               | status | institutions | manual groups       | managed groups |
| -------------------- | ------ | ------------ | ------------------- | -------------- |
| super admin          | yes    | yes          | any                 | yes            |
| institution manager  | yes    | yes          | no                  | no             |
| manual group manager | no     | no           | the ones it manages | no             |

**A field the caller holds no right on keeps its stored value.** `updateUserStatusAndInstitutions` folds the rights into the values actually written, so an out-of-scope change is dropped rather than refused: one 403 for a target out of reach, none for a field out of reach. A membership is per group, so only the groups the caller manages are joined or left and every other membership survives the save.

**The institutional right stops at the managed laboratories**, so `userManagementRights` takes the caller and the target, granting `status` and `institutions` only when the target's recorded laboratory is in the caller's `managedLaboratoryCodes`; a target with no recorded laboratory is out of reach. The right is per (caller, target) for the institutional kind, and caller-based for manual groups, the target already belonging to one of the managed groups since that is what puts it in reach. Holding both kinds grants both rows. An institution manager may move a user out of its own reach, mirroring the auto-demote stance. A membership the manager does not manage renders as a chip with no remove button (`lockedValues`).

**Independent scope pickers** (organismes, OSUs, laboratories, manual groups) with no cascade, unlike the cascading `institutional-groups-fields.tsx`: a manager's reach is a union of independent picks (PO decision). Search by identifier folds it into the option label (`managed-group-items.ts`) rather than changing the shared `MultiCombobox`.

**Stored codes are read leniently**: `knownManagedCodes` drops a code a catalog regeneration removed rather than 500ing a session load, while `managedGroupsSchema` stays strict on write. A manager whose whole scope was retired silently loses the role.

**`currentUser` carries `managedLaboratories` and `managedManualGroups`**, not a `spaceManager` boolean: the admin form needs the expanded laboratory reach to disable fields per target, and the group names to offer attachable groups. The expansion stays server-side in `managedLaboratoryCodes`.

## Alternatives rejected

- A `space_manager` boolean column with its own non-empty-scope invariant: duplicates what the scope already expresses.
- Refusing the save when a super admin clears a manager's last managed group: the PO chose silent auto-demote.
- One uniform space-manager right whatever the scope held: the PO asked for a manual group manager confined to its own groups.
- The institutional right computed from the caller's scope alone: a manager of one laboratory could then edit the institutions of any user its managed manual groups reached.
- Deriving the right from the path the manager reached the target by: the right is computed from the (caller, target) pair instead.
- 403ing a manager that submits a field it may not write, compared round-trip against the stored row: the PO chose to keep the stored value instead, which drops the guard and its comparison helpers.
- An optional scope, absent for a super admin: every reader then re-derived "super admin" from a missing argument.

## Consequences

- ADR 0023 predicted a new role would widen `canPublishSamples` and the ownership override; this one widens `/admin/users` reach instead, touching neither.
- Deleting a manual group, or a catalog regeneration dropping a code, silently demotes a manager, mirroring the "no email is sent" stance for status changes.
- One function builds the where-clause and three queries consume it, so a fourth caller adds a call, never a second copy.
- `GET /admin/currentUser` reads the caller's scope on every call, since the role is derived: one extra query for every authenticated user, plus a second naming the manual groups of a caller that manages any.
- The admin form silently discards a change a manager may not write, so a field it cannot edit must be disabled or the save looks lost.
- The manual group routes now read the caller's scope, so every group page call costs the extra `getModerationScope` query `requireUserModeration` runs.
- A super admin can no longer detach a member owning a published sample of the group, which ADR 0025 had accepted.
