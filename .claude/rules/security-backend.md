---
paths:
  - "packages/api/**/*.ts"
---

# Backend Security

The `api` package holds every implementation and is the real trust boundary: the frontend can be bypassed, the API cannot.

## SQL injection

- Never build queries by string concatenation or interpolation of user input.
- Use parameterized queries or the query builder's bound parameters.
- Use an allow-list for values that can't be bound (ORDER BY columns, LIMIT).

## Input validation

- Validate and coerce every request payload (body, query, route params) against a schema before it reaches business logic.
- Reject unknown fields.
- Revalidate everything server-side: client-side validation does not count.

## Authentication & authorization

- Authenticate every non-public endpoint.
- Authorize per resource, not just per route, enforcing the per-sample role (Contributor/Editor) and Admin checks on every state-changing operation.
- Never trust a role or user id from the client; derive it from the session/token.
- Read realm roles from the verified token (`realm_access.roles`) via the shared role guard.
- Revalidate the session live against Keycloak with the userinfo guard for critical actions (deletions, rights changes, invitations), where a locally valid JWT is not enough (GaiaData [REQ-CRIT-01](../../docs/adr/0006-gaiadata-sso-compliance.md#gt-sso-requirements)).
- If per-user data is ever persisted, IdP account deletion MUST deactivate the local account on signal, with a stale-account fail-safe ([REQ-USER-01](../../docs/adr/0006-gaiadata-sso-compliance.md#gt-sso-requirements)).

## Mass assignment

- Explicitly pick the fields a role may set.
- Never spread a request body into a model or update statement.

## CSRF

- Verify a CSRF token (or require a custom header / SameSite cookies) on all state-changing requests using cookie-based auth.

## Rate limiting

- Rate-limit all endpoints with `rate-limiter-flexible`.
- Key the limiter by client IP on public routes and by user id (`sub`) from the JWT claims on authenticated routes.
- Take the key from the trust boundary: an IP only from a header a reverse proxy we control sets, the `sub` only after the JWT is verified.

## Secrets

- Never hardcode or commit secrets; read them from the environment/secret manager.
- Keep secrets and connection strings out of logs and error responses.

## Error handling & data exposure

- Return generic errors to clients and log details server-side.
- Never leak stack traces, SQL, or internal identifiers.
- Serialize responses through an explicit shape, never dumping raw rows.

## Dependencies

- Run `pnpm audit` in CI and treat high-severity advisories as blocking.
