# 0024. Per-sample contributor role

Date: 2026-08-03

## Status

Accepted. Supersedes ADR 0019's "still to come" paragraph (role column, adding and removing collaborators). Amended 2026-08-14: invites are gated on account status, and status is disclosed to collaborators. Amended 2026-09-04: removal and draft deletion mail the collaborators.

## Context

- ADR 0019 gave every sample one owner and deferred the other roles.
- The PO asked for sharing: an owner shares a draft with a researcher who may edit it, but not publish it or share it further.

## Decision

**Roles live in a `role` column on `user_sample`** (`owner | editor | contributor`, `CHECK`ed, no default so an insert that forgets it fails loud).

- A partial unique index `user_sample_one_owner` allows at most one owner per sample and ignores the other roles.
- Nothing enforces at least one owner, and the admin list reports a `null` owner for a sample that has none.

**Rights come from three domain functions.**

- `canUpdateSample` (`isSampleEditor(role) || (role === "contributor" && !sample.published)`): a contributor loses write access the moment the sample publishes.
- `isSampleEditor` (`owner || editor`): publish, and edit a published sample.
- `canGrantRole` (editor, or contributor granting `contributor`): a contributor recruits help without widening rights beyond their own.
- Every collaborator lists the collaborators; only the owner removes one or changes a role.

**One server-side guard authorizes every route naming a sample id.** `requireSampleAccess` (ADR 0019) now also exposes the caller's role (`null` answers 403), and routes branch on it rather than re-deriving access.

**Inviting requires a live Keycloak session** (`requireActiveSession`, ADR 0006), its first production caller, since granting write access is exactly the rights-granting action that guard was built for, so a revoked but locally-valid JWT is rejected inside its token lifespan.

**Re-inviting moves a collaborator to the invited role, owner only.** `insertSampleCollaborator` takes `mayChangeRole`; an unchanged role answers `already_collaborator`, and any other change without the right is refused 403, so an editor is refused rather than silently ignored. `DELETE /admin/samples/:id/collaborators/:userId` deletes the row `where role != 'owner'`, so an invited editor is removable and the owner's own row never matches.

**A `rejected` account may not be invited, a `pending` one may.** A pending researcher is waiting on moderation, not refused, so shutting them out of a sample they are about to work on would cost the inviter a second pass. `searchUsers` filters `status != 'rejected'` on the shared query builder, so neither the termless browse nor the filtered search ever lists a rejected account, and `insertSampleCollaborator` reads the target's status and 403s before its `currentRole` branches, so re-inviting or changing the role of an already-rejected collaborator is refused too. That refusal precedes the invitation-mail block, so a refused invite mails nobody.

**User search discloses name, email and moderation status to any authenticated researcher.** `GET /admin/users?search=` is the only way to find an account to grant against, and its guard lives on the sample routes, not the user directory. The PO accepted this as bounded, a directory lookup behind OIDC login rather than open enumeration, mitigated by a 2-character minimum and a max length on a term, 10 results per filtered query, 20 per termless browse (the caller excluded), and the per-user `/admin` rate limit (ADR 0029). Status is disclosed in the collaborator list (`sampleCollaboratorSchema`) to every collaborator on that sample, not just the owner; `superAdmin` stays undisclosed, and user search itself stays identity-only, removing the rejected rows rather than annotating them.

**An editor deletes a draft, never a published sample.** `canDeleteSample` grants it to the owner and the editors on a draft alone, moderators in reach included since moderation acts as `editor` (ADR 0030), a published sample answering 403 since its IGSN is public, and `DELETE /admin/samples/:id` sits behind `requireActiveSession` and `unlockedSample` like the other critical writes, so a draft another collaborator is editing answers 409.

## Consequences

- Publishing a shared draft silently revokes the contributor's write access, notifying nobody.
- Being added mails an invitation naming the inviter, sample and role; a re-add that changes nothing sends nothing.
- Being removed mails the removed collaborator, naming the remover and the sample, unless their account is `rejected`.
- Deleting a draft mails every other collaborator, the deleter and `rejected` accounts excluded (`domain/user/can-receive-mail.ts`); the collaborator list is read before the cascading delete of `user_sample` rows.
- A collaborator rejected after being added keeps their `user_sample` row, nothing revoking it. Safe, since `currentUser` 403s a rejected non-super-admin at the admin router root, so the stale row grants nothing and the UI only labels them.
- The zero-owner case stays latent until user deletion (REQ-USER-01) ships: reassign ownership in the same transaction as the delete, or the sample is left with nobody able to publish or share it.
