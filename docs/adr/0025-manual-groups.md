# 0025. Manual groups

Date: 2026-08-14

## Status

Accepted. Amended 2026-08-17, folded in below: a sample can now be attached to a manual group, and the leave rule became per-group.

## Context

- Institutional groups (organisme / OSU / labo) are static catalogs generated from the `sync-data/` export, plus three codes a sample snapshots at creation; membership is derived, never curated (see "Institutional groups" in `architecture.md`).
- The PO asked for a second, orthogonal mechanism: a super admin names a group and picks its members by hand, for cross-institution teams or projects a catalog cannot express.

## Decision

**Manual groups are rows with an explicit membership table** (`manual_group`, `manual_group_member`), unlike institutional groups. A manual group's membership is arbitrary and chosen by a human, so no catalog or generated data can stand in for it, and the two mechanisms stay separate rather than forcing one model to cover both.

**Membership is immediate: no accept flow.** Associating a user adds the row straight away, and the mail sent (`manual-group-invitation-mail.ts`) is a notification, not an invitation, with no token, no pending state and no accept endpoint. This mirrors the sample-collaborator addition (ADR 0024). The rejected alternative was a real token-based invitation with a pending state, which the PO deferred to its own ticket.

**The "Manual" tag on the group list is a static UI label, no column.** A second tag dimension (Teams / Projects, created on the fly) is out of scope, and a column would only ever store one constant value.

**A sample attaches to manual groups through a join table**, `sample_manual_group(sample_id, group_id)`, both columns FK-cascading; `sampleSchema` carries `manualGroups` (id plus name) and `createSampleSchema` carries `manualGroupIds`. Nothing attaches a group automatically, unlike the three institutional codes `insert-sample.ts` snapshots at creation.

- **Only the sample's owner may set or clear them.** `requireSampleAccess` already reports a super admin as `"owner"`, so a super admin can fix a misattribution, choosing only among the sample owner's own memberships, never their own.
- **The attachable set is the owner's current memberships plus whatever ids the sample already stores**, so a group the owner has since left round-trips on save instead of being rejected forever. Anything outside that set is 422; a non-owner changing the stored set is 403, resubmitting it unchanged is accepted.
- **Publication freezes the field through the existing lock maps**, one `manualGroupIds` entry in `published-field-lock.ts` and no new mechanism. `mergePublishedEdit` projects the stored `manualGroups` objects to their ids, the payload key carrying ids.

**A member may leave a group unless they own a published sample attached to that group**, a per-group `canLeave` flag on `GET /admin/currentUser/manual-groups`, checked server-side and matching the `owner` role only, so contributing to someone else's published sample never locks the caller.

**`requireActiveSession` guards the routes that change someone else's rights**: adding a member, removing a member, deleting a group. The target user's own page edits the same memberships through `PUT /admin/users/:id`, which carries the whole `manualGroupIds` set and replaces it in one transaction, so the member routes stay the group page's own. The self-service leave (`DELETE /admin/currentUser/manual-groups/:id`) omits it: leaving revokes only the caller's own membership, grants nothing, and a super admin can restore it.

**Deleting a group detaches its members through the FK cascade**, not an application-side loop, but is refused 409 (`has_published_sample`) when a published sample is attached. A group with only draft samples attached still detaches.

## Consequences

- No mail is sent on detach or on group deletion. The only membership trail is a `console.info` of the actor, group and target ids.
- `GET /admin/users/search` takes an optional `status` param; with no param it still returns pending and accepted, never rejected, which the sample invite-collaborator picker relies on. The manual group associate picker sends `status=accepted`, so a pending account is not offered there; `?status=rejected` is a 400, and the unconditional `status != "rejected"` stays in the SQL. That is a UX narrowing only, `addManualGroupMember`'s accepted-only 422 remaining the enforcement.
- Security review: the endpoint serves any authenticated user and `userIdentitySchema` deliberately omits `status`, yet narrowing to accepted lets a caller infer who is pending by diffing against the unfiltered list. Inherent to filtering by a caller-chosen status, and accepted.
- A member rejected after joining stays a member (explicit PO decision); their status shows in the members table.
- A super admin cannot add themselves, `searchUsers` excluding the caller, but another super admin can add them.
- The leave rule guards the self-service leave only: a super admin detaching a member drops the same rows with no check. Accepted, since a super admin curates the groups.
- The public sample page names the attached groups in their own section, gated on a non-empty list and labelled "Groups", since "manual" is admin jargon a public reader has no context for.
- The Teams/Projects tag distinction stays a separate ticket; filtering published samples by group shipped as its own.
