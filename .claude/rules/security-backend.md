---
paths:
  - "packages/api/**/*.ts"
---

# Backend Security

The `api` package holds all business logic and is the real trust boundary.
The frontend can be bypassed; the API cannot.

## SQL injection

Never build queries by string concatenation or interpolation of user input.
Use parameterized queries or the query builder's bound parameters. For values
that can't be bound (ORDER BY columns, LIMIT), use an allow-list.

## Input validation

Validate and coerce every request payload (body, query, route params) against a
schema before it reaches business logic. Reject unknown fields. Client-side
validation does not count; the API revalidates everything.

## Authentication & authorization

Authenticate every non-public endpoint. Authorize per resource, not just per
route: enforce the per-sample role (Contributor/Editor) and Admin checks on the
server for every state-changing operation. Never trust a role or user id from
the client; derive it from the session/token.

Realm roles come from the verified token (`realm_access.roles`) via the shared
role guard. Critical actions (deletions, rights changes, invitations) must
also revalidate the session live against Keycloak with the userinfo guard
(GaiaData REQ-CRIT-01); a locally valid JWT is not enough there. If per-user
data is ever persisted, IdP account deletion MUST propagate (REQ-USER-01):
deactivate the local account on signal, with a stale-account fail-safe.

## Mass assignment

Explicitly pick the fields a role may set. Never spread a request body into a
model or update statement.

## CSRF

Verify a CSRF token (or require a custom header / SameSite cookies) on all
state-changing requests using cookie-based auth.

## Rate limiting

Rate-limit all endpoints, with stricter limits on auth and submission routes.
Use `rate-limiter-flexible`. Key the limiter by:

- **Public endpoints**: client IP address.
- **User JWT**: user id from the JWT claims.
- **Application JWT**: application id from the JWT claims.

Take the key from the JWT claims, never from the client.

## Secrets

Never hardcode or commit secrets; read them from the environment/secret manager.
Keep secrets and connection strings out of logs and error responses.

## Error handling & data exposure

Return generic errors to clients; log details server-side. Never leak stack
traces, SQL, or internal identifiers. Serialize responses through an explicit
shape; never dump raw rows.

## Dependencies

Run `pnpm audit` in CI and treat high-severity advisories as blocking.
