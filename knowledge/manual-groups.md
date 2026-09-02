---
type: domain-model
title: Manual groups
description: >-
  Curated group rows with explicit membership, orthogonal to the institutional
  catalog, attachable to a sample and frozen once it publishes.
resource: packages/api/src/manual-group
tags:
  - domain
  - groups
  - authz
relations:
  - type: depends_on
    target: user-store-and-ownership
  - type: depends_on
    target: published-field-locks
status: stable
---

The second, orthogonal group mechanism beside [[institutional-groups]]: a super admin names a group and picks its members by hand, for cross-institution teams or projects a catalog cannot express.

- **Rows with an explicit membership table**, `manual_group` and `manual_group_member`. Membership is arbitrary and human-chosen, so no generated catalog can stand in for it.
- **Membership is immediate: no accept flow.** Associating a user adds the row straight away, and `manual-group-invitation-mail.ts` is a notification, with no token, no pending state and no accept endpoint. A token-based invitation is deferred to its own ticket.
- The "Manual" tag on the group list is a static UI label, not a column. A Teams / Projects tag dimension is out of scope.
- **A sample attaches to manual groups through `sample_manual_group(sample_id, group_id)`**, both columns FK-cascading; `sampleSchema` carries `manualGroups` (id plus name), `createSampleSchema` carries `manualGroupIds`. Nothing attaches a group automatically.
  - Only the sample's owner may set or clear them; a super admin reports as `"owner"` and so can fix a misattribution, choosing only among the sample owner's memberships.
  - The attachable set is the owner's current memberships plus whatever ids the sample already stores, so a group the owner has since left round-trips on save. Anything outside is 422; a non-owner changing the stored set is 403, resubmitting it unchanged is accepted.
  - Publication freezes the field through one `manualGroupIds` entry in the existing lock maps ([[published-field-locks]]), `mergePublishedEdit` projecting the stored objects to their ids.
- **A member may leave a group unless they own a published sample attached to it**, a per-group `canLeave` flag on `GET /admin/currentUser/manual-groups`, checked server-side and matching the `owner` role only. That published-sample rule guards every detach, `detachManualGroupMember` being the single path: the self-service leave answers 403, the group page and `PUT /admin/users/:id` answer 409, and `canDetach` rides on the schemas to disable the button. It binds a super admin too.
- **Deleting a group detaches its members through the FK cascade**, but is refused 409 (`has_published_sample`) when a published sample is attached; a group with only draft samples attached still detaches. Creating, renaming and deleting stay super admin; curating members is open to that group's manager ([[space-manager-scope]]).
- `requireActiveSession` guards the routes changing someone else's rights (adding a member, removing a member, deleting a group), never the self-service leave, which grants nothing.
- `GET /admin/users/search` takes an optional `status`; with no param it returns pending and accepted, never rejected, which the sample invite picker relies on. The associate picker sends `status=accepted`, a UX narrowing only, `addManualGroupMember`'s accepted-only 422 being the enforcement. `?status=rejected` is a 400.
- A member rejected after joining stays a member, their status showing in the members table. A super admin cannot add themselves, `searchUsers` excluding the caller.
- No mail on detach or group deletion; the only membership trail is a `console.info` of the actor, group and target ids.
- The public sample page names the attached groups under "Groups", "manual" being admin jargon; filtering published samples by group is a public facet ([[search-facets]]).
