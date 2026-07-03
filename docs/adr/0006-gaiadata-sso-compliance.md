# 6. GaiaData SSO compliance (GT-SSO Recommandations Client v1.3)

## Status

Accepted. Formalizes the 2026-07-03 audit of the auth stack against the
GT-SSO client recommendations; implemented in the same change set.

## Context

Production authentication delegates to the GaiaData mutualized Keycloak
(ADR 0003), governed by "Authentification OpenID avec Keycloak,
Recommandations Client v1.3" (2025-09-03). We audited the admin SPA
(react-oidc-context / oidc-client-ts), the api (hono `jwk`), and the local
dev realm against it.

Already compliant: Authorization Code + PKCE `S256` on a public client,
implicit and ROPC unused in code, bearer-header-only token transport, JWT
validation (JWKS signature, `alg` pinned to RS256, `exp`, `iss`), no tokens
in logs, `state` verified by the library, suffix-only redirect wildcard,
local JWT validation instead of introspection, HSTS at the preprod edge.

Gaps: no dedicated audience and no `aud` validation (the doc's mandatory
trio is signature, `exp`, `aud`); the local realm laxer than prod policy (no
refresh rotation, ROPC on); no `nonce` (oidc-client-ts sends none by default
on the code flow, verified in its source); no logout revocation; unbounded
silent renew; the UserManager constructor starts silent renew and the
provider builds it in a `useState` initializer, so a StrictMode double-mount
arms duplicate renew timers, fatal once refresh tokens are single-use.

## Decision

**The api validates the full mandatory claim set.** `aud` joins signature,
`exp`, `iss` in the `jwk` middleware. The expected audience comes from
`OIDC_AUDIENCE` (default `igsn-api`); the realm carries an `igsn-api`
audience client scope, default on `igsn-admin`. GaiaData's per-environment
audience value is deploy config (REQ-TOKEN-03/04).

**The local realm mirrors prod token policy.** `accessTokenLifespan: 300`,
`ssoSessionIdleTimeout: 1800`, `revokeRefreshToken: true`,
`refreshTokenMaxReuse: 0`, `directAccessGrantsEnabled: false`
(REQ-TOKEN-01/02, REQ-FLOW-02). Rotation bugs surface in dev, not prod.
Accepted dev-only deltas stay as documented in ADR 0003: `sslRequired:
none`, mock IdPs, the `test` user.

**SPA hardening.**

- `nonce: crypto.randomUUID()` on every `signinRedirect`; the library stores
  it and rejects an id_token whose claim differs (REQ-PARAM-00/01).
- `revokeTokensOnSignout: true`: RFC 7009 revocation on logout
  (REQ-TOKEN-05).
- One module-scope UserManager passed to `AuthProvider` via its
  `userManager` prop, removing the StrictMode duplicate-renew mechanism.
- Silent renew stops after user inactivity: `VITE_RENEW_IDLE_CUTOFF_MS`,
  default 3600000 (the doc's 1h) so tests can shrink it (REQ-TOKEN-01 note).
- On api 401: one `signinSilent()` retry, then `signinRedirect()`
  (REQ-TOKEN-01).

**Guards built now, attached per route as endpoints land.**
`requireRole(role)` reads `realm_access.roles` from the verified token and
403s otherwise (REQ-TOKEN-04). `requireActiveSession` forwards the presented
bearer token to `/userinfo` for critical actions (REQ-CRIT-01):
introspection would require a confidential client we deliberately do not
have; the userinfo URL derives from `OIDC_ISSUER` with an
`OIDC_USERINFO_URI` override, the JWKS pattern. The attachment obligations
are recorded in `.claude/rules/security-backend.md` and ADR 0003 checklist
items 11 and 12.

**Deletion propagation (REQ-USER-01) waits on the user store.** When per-user
data exists: `deactivateUser(sub)` plus a stale-account fail-safe with a
configurable retention window, which works regardless of GaiaData's
mechanism; their answer only picks the transport adapter (backchannel
logout, webhook, or polling).

**Keep react-oidc-context; no auth framework.** oidc-client-ts is the
maintained successor of oidc-client-js, a library the doc itself trusts for
state/nonce handling; every gap found was configuration, not a library
defect. Future user data is domain modeling keyed by `sub` (REQ-OIDC-01),
not a second auth system.

**GaiaData onboarding is config, not development.**
[docs/gaiadata-client-provisioning.md](../gaiadata-client-provisioning.md)
is the request we send; the answers land in env (`VITE_OIDC_AUTHORITY`,
`VITE_OIDC_CLIENT_ID`, `OIDC_ISSUER`, `OIDC_AUDIENCE`) and in rollout
planning. Redirect URIs are exact, no wildcard: the SPA always returns to
origin + `/` and deep links ride the oidc `state`.

## Consequences

- Dev exercises what prod enforces: audience, nonce, 5 min tokens,
  single-use rotating refresh tokens. PKCE is enforced server-side
  (`pkce.code.challenge.method: S256`), so the e2e login breaks if the client
  stops sending it; the nonce is unit-asserted on `signinRedirect`, and
  `state` is how oidc-client-ts correlates the callback at all.
- Multi-tab sessions under rotation are a watched risk: sessionStorage is
  per tab but Keycloak keeps one live refresh token per client session, so
  one tab's renewal can invalidate the other's. Observe in dev, then decide
  (Keycloak reuse tolerance, cross-tab coordination, or accept re-login).
- The password grant stops working everywhere, including dev tooling.
- Nothing waits on GaiaData except deploy values and rollout decisions.

Supersedes `SPEC.md`, the working audit document, removed with this change.
