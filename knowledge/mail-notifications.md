---
type: feature
title: Outbound mail and notifications
description: >-
  The api sends invitation, moderated-edit, orphan-group and weekly digest
  mails, rendered twice as text and MJML with i18next copy.
resource: packages/api/src/mail
tags:
  - api
  - mail
  - notifications
relations:
  - type: depends_on
    target: i18n-strategy
  - type: depends_on
    target: space-manager-scope
status: stable
---

The api is the only sender. Copy lives in `packages/api/messages/{locale}.json` and resolves with i18next, not Paraglide ([[i18n-strategy]]); every mail renders twice, as plain text and as MJML, so user-supplied values are escaped with `escapeHtml` at the MJML injection point.

What is sent:

- **Sample collaborator invitation**, naming the inviter, sample and role. A re-add that changes nothing sends nothing, and a refused invite mails nobody ([[per-sample-roles]]).
- **Manual group association notification**, a notification and not an invitation, with no token and no accept endpoint ([[manual-groups]]).
- **Moderated edit and moderated publish**: the owner is mailed on a moderated edit, naming the fields changed, and on a moderated publish, a super admin's edit included ([[space-manager-scope]]).
- **Orphan group mail**: a status change leaving `accepted` mails every super admin, one mail per group left without an active manager, naming the group and linking to its page.
- **Weekly pending-accounts digest**: `listPending` reads every pending row unscoped, then the recipient list is filtered in JS through `userManagementRights`, so an institution manager is mailed only the pending users its `status` right covers and a manual-group-only manager is never mailed. It excludes `super_admin = true` rows, reports and orders by `created_at`, and carries, for super admins only, a recap of groups with no active manager (every manual group without one, and every organisme / OSU / laboratory without one that at least one user row records). The digest is sent when either list is non-empty.
- **Public contact-the-owner form**, reaching the owner of a publicly resolvable sample ([[public-contributor-directory]]).

Not sent: no mail on any user status change, on withdraw, republish, tombstone or restore, on detach or group deletion.

Every link in a mail is built relative to `ADMIN_URL` / `FRONTEND_URL` through `appUrl`, which guarantees the trailing slash: `new URL("samples/x", adminUrl)`, never a leading slash, which would drop the `/admin` mount ([[single-origin-routing]]).

Dev uses the `maildev` sink at http://localhost:1080. Preprod talks STARTTLS on 587 to a transactional-mail provider with the `SMTP_*` host env values, not AWS SES ([[preprod-infrastructure]]).
