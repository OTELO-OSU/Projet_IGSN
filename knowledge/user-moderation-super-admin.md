---
type: auth
title: User moderation and super admin
description: >-
  user.status gates publishing, super admin is a local DB boolean granted only
  by direct SQL, and three paths send a user back to pending.
resource: packages/domain/src/user/can-publish-samples.ts
tags:
  - auth
  - user
  - authz
  - moderation
relations:
  - type: depends_on
    target: user-store-and-ownership
  - type: depends_on
    target: gaiadata-sso-compliance
status: stable
---

**Status lives on the `user` row**: `status` (`pending | accepted | rejected`), default `pending`, set by `currentUser`'s provisioning upsert ([[user-store-and-ownership]]). A pending user drafts but does not publish, a rejected one is locked out entirely, an accepted one is a normal researcher.

- **Publish gating is `canPublishSamples(user)`**: `status === "accepted" || superAdmin`. It runs server-side in `requireSampleAccess`, method-scoped so a GET never trips it: draft PUT, publish, and writing a published sample's fields or attachments all need it. The admin UI mirrors the check for the button and tooltip, but the api is the boundary.
- **Rejected users are locked out in `currentUser`**, the middleware every authenticated route passes, answering 403 rather than 401 so the SPA's silent-renew-then-redirect retry never loops.
- **Super admin is a local DB boolean (`user.super_admin`), not a Keycloak realm role**, the realm being GaiaData's and shared with other service providers. The flag is never token-derived: no claim sets it and no endpoint accepts it as input (`updateUserSchema` is a `strictObject` carrying only the status, the institutional trio and the manual groups), so it changes only by direct database write. `requireRole` stays built but unused.
- **Super admin overrides ownership in `requireSampleAccess`**, and reports as `"owner"` there. `GET /admin/samples` stays per-assignment for every role; global reach lives in the moderation list `GET /admin/samples/moderated` ([[space-manager-scope]]).
- **The first super admin is a one-off manual write per environment**, after that person's first sign-in: `UPDATE "user" SET status = 'accepted', super_admin = true WHERE email = '<email>';`. Promoting a second one is the same UPDATE; there is no UI or endpoint.
- **`/admin/users` (list, read, update) is gated by `canModerateUsers`**, super admin or a space manager holding at least one managed laboratory. A status change additionally revalidates the live session (`requireActiveSession`), being a rights change.
- **Three paths lead back to `pending`.** A user changing their own organisme / OSU / labo trio re-pends themselves, that trio being what a moderator judged; resubmitting the same trio or declaring one for the first time leaves the status untouched, and a super admin keeps `accepted`. A moderator's `PUT /admin/users/:id` sets another user's status and trio in one save, so that edit is itself the moderation and never re-pends its target; `settableUserStatuses` bounds a caller-submitted status to putting an account back to `pending` only while it is still `pending`. The third path is a moderator removing the target's institution, the resulting status derived server-side by `shouldRePendOnInstitutionsUpdate` and never caller-submitted. A target that is a super admin, or already trio-less, keeps its status. Submitting `rejected` alongside a cleared trio lands on `pending`, so a reject-and-strip needs two saves.
- **Status changes propagate on reconnect only.** `/admin/currentUser` is read once and cached `staleTime: Infinity`, so a user moderated mid-session keeps their prior banner and publish state until a re-fetch. No websocket, no polling.
- No mail fires on a status change; a moderated user learns their status by loading the app. The weekly digest sweeps the `pending` column ([[mail-notifications]]).
