# 0024. Per-sample contributor role

Date: 2026-08-03

## Status

Accepted. Supersedes ADR 0019's "still to come" paragraph (role column, adding and removing collaborators).

## Context

- ADR 0019 gave every sample one owner and deferred the other roles.
- The PO asked for sharing: an owner shares a draft with a researcher who may edit it, but not publish it or share it further.

## Decision

**Roles live in a `role` column on `user_sample`** (`owner | editor | contributor`, `CHECK`ed, no default so an insert that forgets it fails loud).

- A partial unique index `user_sample_one_owner` allows at most one owner per sample and ignores the other roles.
- Nothing enforces at least one owner; `withSampleOwners` assumes one and throws if it finds none.

**Rights come from three domain functions.**

- `canUpdateSample` (`isSampleEditor(role) || (role === "contributor" && !sample.published)`): a contributor loses write access the moment the sample publishes.
- `isSampleEditor` (`owner || editor`): publish, and edit a published sample.
- `canGrantRole` (editor, or contributor granting `contributor`): a contributor recruits help without widening rights beyond their own.
- Every collaborator lists the collaborators.
- Owner only: remove a collaborator, or change one's role.

**One server-side guard authorizes every route naming a sample id.** `requireSampleAccess` (ADR 0019) now also exposes the caller's role (`null` answers 403), and routes branch on it rather than re-deriving access.

**Inviting requires a live Keycloak session** (`requireActiveSession`, ADR 0006), its first production caller, since granting write access is exactly the rights-granting action that guard was built for.

- A revoked but locally-valid JWT is rejected inside its token lifespan.
- `OIDC_USERINFO_URI` overrides the issuer-derived default in the dev and e2e compose files; preprod derives it from `OIDC_ISSUER`.

**Re-inviting moves a collaborator to the invited role, owner only.** `addCollaborator` takes `mayChangeRole`; an unchanged role answers `already_collaborator`, any other change without the right `role_change_forbidden` (403), so an editor is refused rather than silently ignored.

**`DELETE /admin/samples/:id/collaborators/:userId`** deletes the row `where role != 'owner'`, so an invited editor is removable and the owner's own row never matches.

**User search discloses name and email to any authenticated researcher.** `GET /admin/users?search=` is the only way to find an account to grant against, and its guard lives on the sample routes, not the user directory.

- The PO accepted this as bounded: a directory lookup behind OIDC login, not open enumeration.
- Mitigations: 2-character minimum and a max length on a term, 10 results per filtered query, 20 per termless browse (colleagues listed before typing, caller excluded), and the per-user `/admin` rate limit (ADR 0020).

**Delete-draft is a follow-up.** The card lists it as an editor right, but no role can delete a draft since the product has no such route.

## Consequences

- Publishing a shared draft silently revokes the contributor's write access, notifying nobody.
- Being added mails an invitation naming the inviter, sample, and role (since 2026-08-07); a re-add that changes nothing sends nothing.
- An admin override remains open, as ADR 0019 left it.
- The zero-owner case stays latent until user deletion (REQ-USER-01) ships; reassign ownership in the same transaction as the delete, or a contributor's admin list 500s.
