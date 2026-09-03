---
type: auth
title: "Space manager: scoped user and sample moderation"
description: >-
  A space manager is a non-empty managed scope, not a flag; reach lives only in
  SQL and covers users by recorded laboratory and samples by their own codes or
  groups.
resource: packages/api/src/user/moderation-scope-where.ts
tags:
  - auth
  - authz
  - moderation
  - groups
relations:
  - type: depends_on
    target: user-moderation-super-admin
  - type: depends_on
    target: institutional-groups
  - type: depends_on
    target: manual-groups
status: stable
---

"Gestionnaire d'espaces" (space manager) is a delegated moderator so an unavailable super admin does not block every pending researcher.

**The role is a non-empty scope, not a flag.** No column and no claim carry it: a user is a space manager exactly when `isSpaceManager` finds one managed code or manual group, so clearing every picker demotes them in the same save. Only a super admin grants it, through `GET|POST /admin/manual-groups/:id/managers`, `DELETE .../managers/:userId` and the same trio at `/admin/institutional-groups/:kind/:code/managers`, all behind `requireSuperAdmin` since a manager must not grant peers, mutations also behind `requireActiveSession`.

**Two tables**: `user_managed_institutional_group(user_id, kind, code)` and `user_managed_manual_group(user_id, group_id)`; only the second has an FK, the institutional catalogs being TypeScript data.

**User reach.** A user is in reach when its recorded `institutional_laboratory` is in the scope expanded to laboratory codes (`managedLaboratoryCodes`). A managed manual group never widens that reach, and a target with no recorded laboratory is out of reach. A managed organisme grants every laboratory it holds, its OSUs whole, including laboratories held only by another organisme; the right derives from the group managed, never from the target's own organisme.

- Reach lives only in SQL, in `api/src/user/moderation-scope-where.ts`, threaded into `list`, `get`, `update` and the institution-removal endpoint's `FOR UPDATE` pre-image. A super-admin scope runs unfiltered; a scope managing nothing compiles to a `false` literal, never a dropped `WHERE`. The clause excludes `id = callerId` and every `super_admin = true` row, so a manager never moderates a super admin.
- Every moderating caller carries a `ModerationScope` (`callerId`, `superAdmin`, `managedLaboratories`, `managedManualGroupIds`), so no reader reads an absent scope as "super admin".

**Rights per caller kind** (`domain/user/user-management-rights.ts`, read by the api and by the admin form, which disables the rest): a super admin writes status, institutions, any manual group and managed groups; an institution manager writes status and institutions only; a dual manager adds the manual groups it manages; a manual-group-only manager gets 403 on the whole user page, `canModerateUsers` requiring at least one managed laboratory. `status` and `institutions` are per (caller, target), the manual-group right is caller-based. A field the caller holds no right on keeps its stored value: one 403 for a target out of reach, none for a field out of reach, so a field a manager cannot edit must be disabled or the save looks lost. A manager may move a user out of its own reach.

**Sample reach.** `GET /admin/samples/moderated` lists in-scope samples (`api/src/sample/service/moderated-sample-where.ts`), and `requireSampleAccess` extends the ownership override to a manager for a sample its scope reaches, computing `managed` for every found sample and `moderating` as `managed && !owner`.

- A sample is in reach when its snapshotted `institutional_laboratory` is in the expanded codes, or when one of its attached manual groups is managed; a manual group is reach enough for a sample, gating the page through `canModerateSamples`.
- Reach reads the sample row, not its owner's, so a sample keeps its moderators when its owner moves institution, and a sample with no laboratory and no managed group is in nobody's reach. A super admin's account is out of every manager's reach, but a sample it owns is not.
- A moderator acts as `editor`: it edits and publishes, but never grants a role or changes the attached manual groups.
- Entering or leaving `tombstone` is gated on this reach rather than the editor role ([[sample-status-lifecycle]]).

**Group curation.** `/admin/manual-groups` is open to a manual group manager for its own groups (`canManageManualGroup`): reading a group and its members, associating and detaching. Creating, renaming and deleting a group stay super admin. The members table links to no user page, half its rows leading nowhere for an institutional manager.

**Other facts.** `currentUser` carries `managedLaboratories` and `managedManualGroups`, not a `spaceManager` boolean, the expansion staying server-side; the scope is derived, so every call re-reads it. Scope pickers are independent with no cascade, a reach being a union of independent picks. Stored codes are read leniently (`knownManagedCodes` drops a code a catalog regeneration removed) while `managedGroupsSchema` stays strict on write. A manager is active only when its own row is `accepted` and only a direct assignment counts, so a laboratory whose organisme has a manager is still without one.
