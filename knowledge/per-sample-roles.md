---
type: auth
title: Per-sample roles and collaboration
description: >-
  user_sample.role is owner | editor | contributor, with three domain predicates
  deciding update, publish and grant rights.
resource: packages/domain/src/user-sample
tags:
  - auth
  - authz
  - sample
  - collaboration
relations:
  - type: depends_on
    target: user-store-and-ownership
  - type: depends_on
    target: sample-status-lifecycle
  - type: depends_on
    target: user-moderation-super-admin
status: stable
---

Roles live in a `role` column on `user_sample` (`owner | editor | contributor`, `CHECK`ed, no default so an insert forgetting it fails loud). An owner shares a draft with a researcher who may edit it but not publish it or share it further.

- A partial unique index `user_sample_one_owner` allows at most one owner per sample and ignores the other roles. Nothing enforces at least one owner, and the admin list reports a `null` owner for a sample that has none.
- **Rights are three domain functions**: `canUpdateSample` (`isSampleEditor(role) || (role === "contributor" && !hasPermanentIgsn(sample))`), so a contributor loses write access the moment the sample publishes; `isSampleEditor` (owner or editor), which publishes and edits a published sample; `canGrantRole` (an editor, or a contributor granting `contributor`), so a contributor recruits help without widening rights. `canDeleteSample` grants deletion to the owner and editors on a draft alone, moderators in reach included, a permanent IGSN answering 403.
- Every collaborator lists the collaborators; only the owner removes one or changes a role.
- **One server-side guard authorizes every route naming a sample id**: `requireSampleAccess` exposes the caller's role (`null` answers 403) and routes branch on it rather than re-deriving access.
- **Inviting requires a live Keycloak session** (`requireActiveSession`), granting write access being exactly the rights-granting action that guard exists for.
- **Re-inviting moves a collaborator to the invited role, owner only.** `insertSampleCollaborator` takes `mayChangeRole`; an unchanged role answers `already_collaborator`, any other change without the right is refused 403. `DELETE /admin/samples/:id/collaborators/:userId` deletes `where role != 'owner'`, so the owner's own row never matches.
- **A `rejected` account may not be invited, a `pending` one may**, a pending researcher waiting on moderation rather than being refused. `searchUsers` filters `status != 'rejected'` on the shared query builder, and `insertSampleCollaborator` reads the target's status and 403s before its role branches, refusing before any mail is sent.
- **User search discloses name, email and moderation status to any authenticated researcher**, `GET /admin/users?search=` being the only way to find an account to grant against. Accepted as bounded: a 2-character minimum, a max term length, 10 results per filtered query, 20 per termless browse with the caller excluded, plus the per-user `/admin` rate limit. `superAdmin` stays undisclosed. Status is disclosed in the collaborator list to every collaborator on that sample.
- Deletion sits behind `requireActiveSession` and `unlockedSample`, so a draft another collaborator is editing answers 409.
- Publishing a shared draft silently revokes the contributor's write access, notifying nobody. Being added mails an invitation ([[mail-notifications]]); a re-add that changes nothing sends nothing.
- A collaborator rejected after being added keeps their row, which grants nothing since `currentUser` 403s them at the admin router root.
