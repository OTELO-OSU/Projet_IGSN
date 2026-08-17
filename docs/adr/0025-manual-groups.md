# 0025. Manual groups

Date: 2026-08-14

## Status

Accepted

## Context

- Institutional groups (organisme / OSU / labo) are static catalogs generated from the `sync-data/` export, plus three codes a sample snapshots at creation; membership is derived, never curated (see "Institutional groups" in `architecture.md`).
- The PO asked for a second, orthogonal mechanism: a super admin names a group and picks its members by hand, for cross-institution teams or projects a catalog cannot express.

## Decision

**Manual groups are rows with an explicit membership table** (`manual_group`, `manual_group_member`), unlike institutional groups. A manual group's membership is arbitrary and chosen by a human, so no catalog or generated data can stand in for it; the two mechanisms stay separate rather than forcing one model to cover both.

**Membership is immediate: no accept flow.** Associating a user adds the row straight away; the mail sent (`manual-group-invitation-mail.ts`) is a notification, not an invitation, with no token, no pending state, and no accept endpoint. This mirrors the sample-collaborator addition (ADR 0024). The rejected alternative was a real token-based invitation with a pending state; the PO deferred it to its own ticket.

**The "Manual" tag on the group list is a static UI label, no column.** A second tag dimension (Teams / Projects, created on the fly) is out of scope for this ticket, and a column would only ever store one constant value.

**A sample is never auto-attached to a manual group.** Unlike the three institutional codes `insert-sample.ts` snapshots at creation, nothing in this ticket writes a group onto a sample; an e2e journey (`e2e/admin/manual-groups.spec.ts`) guards the absence.

**A member may leave a group unless they own a published sample**, checked server-side through `UserRepository.hasPublishedSample`, which matches the `owner` role only: contributing to someone else's published sample never locks the caller. The rule is per-user, not per-group, so one `canLeave` flag on `GET /admin/currentUser/manual-groups` covers every group the caller belongs to.

**`requireActiveSession` guards the routes that change someone else's rights**: adding a member, removing a member, deleting a group. The self-service leave (`DELETE /admin/currentUser/manual-groups/:id`) omits it, matching `PUT /admin/currentUser/institutional-groups`: leaving revokes only the caller's own membership, grants nothing, and a super admin can restore it.

**Deleting a group detaches its members through the `manual_group_member` FK cascade**, not an application-side loop.

## Consequences

- No mail is sent on detach or on group deletion. The only membership trail is a `console.info` of the actor, group, and target ids.
- `GET /admin/users/search` takes an optional `status` param; with no param it still returns pending and accepted (never rejected), which the sample invite-collaborator picker relies on.
- The manual group associate picker sends `status=accepted`, so a pending account is no longer offered. `?status=rejected` is a 400, and the unconditional `status != "rejected"` stays in the SQL, so a rejected account is never returned regardless of the param.
- This is a UX narrowing only: `addManualGroupMember`'s accepted-only 422 remains the actual enforcement.
- Security review: the endpoint serves any authenticated user, and `userIdentitySchema` deliberately omits `status`, yet narrowing to accepted lets a caller infer who is pending by diffing against the unfiltered list. That is inherent to filtering by a caller-chosen status and accepted.
- A member rejected after joining stays a member (explicit PO decision); their status shows in the members table.
- A super admin cannot add themselves, since `searchUsers` excludes the caller. Another super admin can add them.
- The leave rule is temporary (PO, 2026-08-17): once a sample can be attached to a manual group, leaving will be blocked by a published sample attached to that group, not by the caller owning one anywhere. It then becomes per-group, so `canLeave` becomes a per-group flag instead of one meta field.
- Until then a member owning a published sample is locked into every group, including groups no published sample was ever attributed to.
- The rule guards the self-service leave only: a super admin detaching a member, or deleting the group, drops the same rows with no check. Accepted, since a super admin curates the groups.
- Assigning a sample to a manual group, filtering samples by group, and the Teams/Projects tag distinction are separate tickets.
