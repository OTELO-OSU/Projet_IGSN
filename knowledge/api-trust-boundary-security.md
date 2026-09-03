---
type: practice
title: API trust boundary and security rules
description: >-
  api holds the only real boundary: every payload validated, authorization per
  resource, fields picked explicitly, responses shaped explicitly.
resource: .claude/rules/security-backend.md
tags:
  - security
  - api
  - practice
relations:
  - type: depends_on
    target: user-store-and-ownership
  - type: depends_on
    target: rate-limiting
  - type: depends_on
    target: gaiadata-sso-compliance
status: stable
---

The `api` package holds every implementation and is the real trust boundary: the frontend can be bypassed, the api cannot.

- **SQL injection**: never build queries by concatenation or interpolation of user input; use bound parameters, and an allow-list for what cannot be bound (ORDER BY columns, LIMIT).
- **Input validation**: validate and coerce every payload (body, query, route params) against a schema before business logic, reject unknown fields, and revalidate server-side whatever the client checked.
- **Authorization per resource, not per route**, enforcing the per-sample role and the admin checks on every state-changing operation ([[per-sample-roles]]). Never trust a role or user id from the client; derive it from the verified token, roles from `realm_access.roles` through the shared guard. Critical actions (deletions, rights changes, invitations) revalidate the session live against Keycloak ([[gaiadata-sso-compliance]]).
- **Mass assignment**: explicitly pick the fields a role may set, never spread a request body into a model or update statement. `mergePublishedEdit` is that guard for a published sample ([[published-field-locks]]).
- **CSRF**: verify a token, custom header or SameSite cookies on state-changing requests using cookie-based auth; the apps send the API-issued CSRF token on every state-changing request.
- **Rate limiting** on all endpoints, keyed by client IP publicly and by JWT `sub` when authenticated, the key taken from the trust boundary ([[rate-limiting]]).
- **Secrets** are read from the environment, never hardcoded, committed, or logged.
- **Errors and exposure**: generic errors to clients, details logged server-side, no stack traces, SQL or internal identifiers, and responses serialized through an explicit shape rather than raw rows.
- `pnpm audit` runs in CI and a high-severity advisory blocks.
- **Frontend security**: never inject unsanitized HTML (`innerHTML`, `dangerouslySetInnerHTML`), sanitize user-generated HTML with a vetted local sanitizer where unavoidable, load third-party scripts asynchronously with SRI and prefer self-hosting. Client-side validation is UX only. A super-admin page is gated with `admin/src/auth/super-admin-only.tsx`, which renders nothing until `currentUser` answers, never as the boundary: `requireSuperAdmin` on the api is.
