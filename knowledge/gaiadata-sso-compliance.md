---
type: auth
title: GaiaData SSO compliance (GT-SSO Recommandations Client v1.3)
description: >-
  The auth stack is audited against the GT-SSO client recommendations: full
  claim validation, prod token policy mirrored in dev, and SPA hardening.
resource: docs/adr/0006-gaiadata-sso-compliance.md
tags:
  - auth
  - security
  - compliance
relations:
  - type: depends_on
    target: auth-keycloak-gaiadata
status: stable
---

Production auth delegates to the GaiaData mutualized Keycloak, governed by "Authentification OpenID avec Keycloak, Recommandations Client v1.3".

**Token validation in the api.** Signature, `exp`, `iss` and RS256 pinning are mandatory. `exp` is checked by the same explicit claim check, since the `jwk` middleware only validates it when present. `aud` validation is opt-in, applied only when `OIDC_AUDIENCE` is set, because the GaiaData test realm exposes no dedicated audience scope. Two claim checks stand in for the audience on that shared realm: `azp` must equal `OIDC_CLIENT_ID` and `typ` must be `Bearer`, Keycloak marking id_tokens `ID`, which blocks another service provider's token and an id_token replayed as a bearer. This is a knowing deviation from REQ-TOKEN-03/04; when GaiaData ships an audience scope, set `OIDC_AUDIENCE` per environment and restore the mock realm's mapper, and the `azp`/`typ` check can go.

**The local realm mirrors prod token policy**, so rotation bugs surface in dev: `accessTokenLifespan: 300`, `ssoSessionIdleTimeout: 1800`, `revokeRefreshToken: true`, `refreshTokenMaxReuse: 0`, `directAccessGrantsEnabled: false`. The password grant works nowhere, dev tooling included. PKCE `S256` is enforced server-side.

**SPA hardening.** `nonce: crypto.randomUUID()` on every `signinRedirect`; `revokeTokensOnSignout: true` for RFC 7009 revocation, access token only, since revoking the refresh token ends the session before the end_session redirect and skips the brokered IdP logout; one module-scope `UserManager` passed through `AuthProvider`, which removes the StrictMode duplicate-renew timers; silent renew stops after user inactivity (`VITE_RENEW_IDLE_CUTOFF_MS`, default one hour); on an api 401, one `signinSilent()` retry then `signinRedirect()`.

**Guards built and attached per route.** `requireRole(role)` reads `realm_access.roles` and 403s otherwise; it stays unused, the realm being GaiaData's ([[user-moderation-super-admin]]). `requireActiveSession` forwards the presented bearer token to `/userinfo` for critical actions (REQ-CRIT-01), introspection needing a confidential client we do not have; its URL derives from `OIDC_ISSUER` with an `OIDC_USERINFO_URI` override.

**Watched risk**: multi-tab sessions under refresh rotation, `sessionStorage` being per tab while Keycloak keeps one live refresh token per client session.

**Deletion propagation (REQ-USER-01) waits on GaiaData's signal**; the plan is `deactivateUser(sub)` plus a stale-account fail-safe with a configurable retention window, their answer only picking the transport.

Requirement codes cited across the docs: REQ-FLOW-02 (no ROPC), REQ-TOKEN-01 (5 minute access tokens, renew stops after an hour idle), REQ-TOKEN-02 (single-use refresh tokens, 30 minutes max for a SPA), REQ-TOKEN-03 (audience dedicated per service provider and environment), REQ-TOKEN-04 (full validation: signature, exp, aud, plus iss and roles for critical apps), REQ-TOKEN-05 (revocation on logout), REQ-PARAM-00/01 (state and nonce mandatory, random, verified), REQ-PARAM-02 (redirect wildcards only as a path suffix), REQ-CONSENT-1, REQ-OIDC-01 (`sub` is the stable identifier, matching between id_token and userinfo), REQ-CRIT-01 (critical actions revalidate live), REQ-USER-01 (an account deleted at the IdP is deactivated everywhere).
