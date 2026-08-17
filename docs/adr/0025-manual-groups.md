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

**`requireActiveSession` guards the routes that change someone else's rights**: adding a member, removing a member, deleting a group. Since this ticket, the target user's own page edits the same memberships through `PUT /admin/users/:id`, which carries the whole `manualGroupIds` set and replaces it in one transaction, so the member routes stay the group page's own. The self-service leave (`DELETE /admin/currentUser/manual-groups/:id`) omits it: leaving revokes only the caller's own membership, grants nothing, and a super admin can restore it. `PUT /admin/currentUser/institutional-groups` does carry it since ticket 115, a group change now costing the caller their `accepted` status (ADR 0023).

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

## Amendment (2026-08-17): attaching a sample to a manual group

Ticket 119 delivered the sample-attachment follow-up this ADR deferred. This corrects the Consequences above: a sample is no longer never auto-attached, and the leave rule below replaces the temporary per-user one.

- **A join table, `sample_manual_group(sample_id, group_id)`**, both columns FK-cascading. `sampleSchema` gained `manualGroups` (id + name); `createSampleSchema` gained `manualGroupIds`.
- **Only the sample's owner may set or clear them.** `requireSampleAccess` already reports a super admin as `"owner"`; this ticket reuses that so a super admin can fix a misattribution, choosing only among the sample owner's own memberships, never the super admin's.
- **The attachable set is the owner's current memberships plus whatever ids are already stored on the sample**, so a group the owner has since left round-trips on save instead of getting rejected forever. Submitting anything outside that set is 422; a non-owner (a contributor) changing the stored set is 403, resubmitting it unchanged is accepted.
- **Publication freezes the field through the existing lock maps** in `published-field-lock.ts`, one entry (`manualGroupIds`), no new mechanism. It needs its own map, not the sample fields' one, only because the stored key is `manualGroups` (objects) while the payload key is `manualGroupIds`.
- **Deleting a manual group with a published sample attached is refused 409** (`has_published_sample`). A group with only draft samples attached still detaches, through the same FK cascade.
- **The per-user leave lock is gone**, replaced by a per-group `canLeave` flag on `GET /admin/currentUser/manual-groups` (the `meta` field is dropped): a caller can leave any group unless they own a published sample attached to _that_ group. `UserRepository.hasPublishedSample` is deleted along with it.
- **The public sample page names the attached groups in their own section**, gated on a non-empty list, labelled "Groups": "manual" is admin jargon a public reader has no context for.
