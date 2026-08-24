# 0030. Scoped user moderation (space manager)

Date: 2026-08-20

## Status

Accepted. Amended 2026-08-21, 2026-08-24 and 2026-08-25, folded in below.

## Context

- ADR 0023 made `/admin/users` super-admin-only, so an unavailable super admin blocked every pending researcher.
- The PO asked for a delegated role, "Gestionnaire d'espaces" (space manager), moderating a subset of users without full super-admin power.

## Decision

**The role is a non-empty scope, not a flag.** No column and no Keycloak claim carry it: a user is a space manager exactly when `isSpaceManager` finds one managed code or manual group, so clearing every picker demotes them in the same save, with no 422. Only a super admin grants the role.

**Two tables**: `user_managed_institutional_group(user_id, kind, code)` and `user_managed_manual_group(user_id, group_id)`. Only the manual-group one has an FK, cascading on delete, the institutional catalogs being TypeScript data, not rows.

**A user is in reach when its recorded `institutional_laboratory` is in the scope expanded to laboratory codes** (`managedLaboratoryCodes`): a managed manual group never widens that reach, and a target with no recorded laboratory is out of reach.

- A managed organisme grants every laboratory it holds, so it grants its OSUs whole, including laboratories held only by another organisme.
- The right derives from the group managed, never from the target's own organisme.

**Reach lives only in SQL**, in `api/src/user/moderation-scope-where.ts`, threaded into `list`, `get`, `update`, and the institution-removal endpoint's `FOR UPDATE` pre-image so they cannot drift apart.

- A super-admin scope runs unfiltered; a scope managing nothing compiles to a `false` literal, never a dropped `WHERE`.
- The clause also excludes `id = callerId` and every `super_admin = true` row, so a manager never moderates a super admin (PO decision).
- Every moderating caller carries a `ModerationScope` (`callerId`, `superAdmin`, `managedLaboratories`, `managedManualGroupIds`), so no reader reads an absent scope as "super admin".

**`/admin/users` (list, read, update) is gated by `canModerateUsers`: super admin or at least one managed laboratory.** A manual-group-only manager, like an institution manager whose scope resolves to no laboratory, gets 403 on all three rather than an empty list. `domain/user/can-moderate-users.ts` takes `{ superAdmin, managedLaboratories }`, so the api's `ModerationScope` satisfies it directly. The manual-group routes and `/admin/users/search` stay open to a manual-group manager, curating a group and inviting a member needing neither right.

**A manager edits only the fields of the kind it manages**, per `domain/user/user-management-rights.ts`, read by the api (`update-user-status-and-institutions.ts`, plus `canManageManualGroup` per group) and by the admin form, which disables the rest.

| Caller                              | status | institutions | manual groups       | managed groups |
| ----------------------------------- | ------ | ------------ | ------------------- | -------------- |
| super admin                         | yes    | yes          | any                 | yes            |
| institution manager                 | yes    | yes          | no                  | no             |
| dual manager (institution + manual) | yes    | yes          | the ones it manages | no             |
| manual group manager only           | 403    | 403          | 403                 | 403            |

- `status` and `institutions` are per (caller, target); the manual-group right is caller-based, so a dual manager curates its own groups from any user page it reaches.
- A field the caller holds no right on keeps its stored value: one 403 for a target out of reach, none for a field out of reach.
- A save joins or leaves only the managed groups; one the manager does not manage renders as a chip with no remove button (`lockedValues`).
- A manager may move a user out of its own reach, mirroring the auto-demote stance.
- The SQL clause matches that gate: a dual manager's user pages hold its managed laboratories alone, a member reached only through a group being curated from the group page.

**The weekday pending-accounts digest follows that same `status` right**, filtered in JS through `userManagementRights`, `listPending` reading every pending row unscoped.

- An institution manager is mailed only the pending users its `status` right covers, and a manual group manager, holding none, is never mailed.
- `listPending` excludes `super_admin = true` for every recipient, matching the reach clause, so a pending super admin, which only a partial manual `UPDATE` creates, reaches no digest and still accepts itself.

**A manual group manager curates its groups from the group page**, `/admin/manual-groups` no longer being super-admin-only.

- The list answers with the managed groups alone; reading a group and its members, associating and detaching one are open to that group's manager, per `canManageManualGroup`.
- The members table links to no user page, since half its rows would lead nowhere for a manager whose reach is institutional.
- Creating, renaming and deleting a group stay super admin, so a manager adds a member `/admin/users` cannot reach, its reach being the current members.
- No detach may drop a member owning a published sample of the group, `detachManualGroupMember` being the single path behind the self-service leave, the group page and `PUT /admin/users/:id`, and answering 409 rather than dropping the change.
- `canDetach` rides on `manualGroupMemberSchema` and `adminUserSchema.manualGroups`, disabling the Detach button and locking the chip; the 409 stays the boundary for a page gone stale.

**The same scope also moderates samples, through the sample's own groups.** `GET /admin/samples/moderated` lists them (`api/src/sample/service/moderated-sample-where.ts`), and `requireSampleAccess` extends the super admin's ownership override to a manager for a sample its scope reaches.

- A sample is in reach when its snapshotted `institutional_laboratory` is in the expanded laboratory codes, or when one of its attached manual groups is managed, a manual group being reach enough for a sample and gating the page through `canModerateSamples`.
- Reach reads the sample row, not its owner's, so a sample keeps its moderators when its owner moves institution and a sample with no laboratory and no managed group is in nobody's reach.
- A moderator acts as `editor`: it edits and publishes, but never grants a role or changes the attached manual groups, those following the share it holds itself (`shareRole`).
- The owner is mailed on a moderated edit, naming the fields changed, and on a moderated publish, a super admin's edit included.
- The list carries the owner's account status, which the per-assignment `GET /admin/samples` does not.

**Independent scope pickers** (organismes, OSUs, laboratories, manual groups) with no cascade, unlike `institutional-groups-fields.tsx`: a manager's reach is a union of independent picks (PO decision). Search by identifier folds into the option label (`managed-group-items.ts`), leaving the shared `MultiCombobox` alone.

**Stored codes are read leniently**: `knownManagedCodes` drops a code a catalog regeneration removed rather than 500ing a session load, while `managedGroupsSchema` stays strict on write.

**`currentUser` carries `managedLaboratories` and `managedManualGroups`**, not a `spaceManager` boolean: the admin form needs the expanded reach to disable fields per target, and the group names to offer attachable groups. The expansion stays server-side, in `managedLaboratoryCodes`.

## Alternatives rejected

- A `space_manager` boolean column with its own non-empty-scope invariant: duplicates what the scope already expresses.
- Refusing the save when a super admin clears a manager's last managed group: the PO chose silent auto-demote.
- One uniform space-manager right whatever the scope held: the PO asked for a manual group manager confined to its own groups.
- The institutional right computed from the caller's scope alone: a manager of one laboratory could then edit the institutions of any user its managed manual groups reached.
- 403ing a manager that submits a field it may not write, compared round-trip against the stored row: keeping the stored value drops the guard and its comparison helpers.
- An optional scope, absent for a super admin: every reader then re-derived "super admin" from a missing argument.
- A manual-group-only manager still moderating users via the SQL reach clause: the PO deemed manual groups too narrow a right to open the whole user page.
- A dual manager's user-page reach widened by its managed groups: the PO wants those pages institutional, a group-only member being curated from the group page.
- Letting a manager moderate a super admin in its scope: the PO keeps super admins out of every manager's reach and out of the digest.

## Consequences

- ADR 0023 predicted a new role would widen `canPublishSamples` and the ownership override; this one widens `/admin/users` reach and, per sample in scope, the ownership override, leaving `canPublishSamples` alone, so a pending manager still publishes nothing.
- Deleting a manual group, or a catalog regeneration dropping a code, silently demotes a manager, mirroring the "no email is sent" stance; the digest is the one mail a manager does receive.
- The scope is derived, so `GET /admin/currentUser` and every manual group route re-read it: one query per call, plus a second naming the managed manual groups.
- Removing a user's institution rides the same users list and institutional-group member tables, guards unchanged, and lands on `shouldRePendOnInstitutionsUpdate` (ADR 0023) for the resulting status; a manager removing a target's institution thereby moves that target out of its own reach, the same auto-demote stance as clearing a managed group.
- The admin form silently discards a change a manager may not write, so a field it cannot edit must be disabled or the save looks lost.
- A super admin can no longer detach a member owning a published sample of the group, which ADR 0025 had accepted.
- A super admin's account is out of every manager's reach, but a sample it owns is not, sample reach reading the sample row.
