# 0006. GaiaData SSO compliance (GT-SSO Recommandations Client v1.3)

## Status

Accepted. Formalizes the 2026-07-03 audit of the auth stack against the GT-SSO client recommendations, implemented in the same change set. Amended 2026-07-30 (audience validation).

## Context

Production authentication delegates to the GaiaData mutualized Keycloak (ADR 0003), governed by "Authentification OpenID avec Keycloak, Recommandations Client v1.3" (2025-09-03). We audited the admin SPA (react-oidc-context / oidc-client-ts), the api (hono `jwk`) and the local dev realm against it.

Already compliant: Authorization Code + PKCE `S256` on a public client, bearer-header-only transport, signature / `alg` / `exp` / `iss` validation, no tokens in logs, `state` verified by the library, suffix-only redirect wildcard, local validation instead of introspection, HSTS at the edge.

Gaps found: no dedicated audience and no `aud` check, a local realm laxer than prod policy (no refresh rotation, ROPC on), no `nonce`, no logout revocation, unbounded silent renew, and a StrictMode double-mount arming duplicate renew timers, fatal once refresh tokens are single-use.

## Decision

**The api validates the full mandatory claim set.** `aud` joins signature, `exp` and `iss` in the `jwk` middleware, expected from `OIDC_AUDIENCE` (default `igsn-api`) against an `igsn-api` audience client scope on `igsn-admin` ([REQ-TOKEN-03/04](#gt-sso-requirements)). Amended below: the `aud` check is now opt-in.

**The local realm mirrors prod token policy**: `accessTokenLifespan: 300`, `ssoSessionIdleTimeout: 1800`, `revokeRefreshToken: true`, `refreshTokenMaxReuse: 0`, `directAccessGrantsEnabled: false` ([REQ-TOKEN-01/02](#gt-sso-requirements), [REQ-FLOW-02](#gt-sso-requirements)), so rotation bugs surface in dev rather than prod. The accepted dev-only deltas stay as ADR 0003 documents them.

**SPA hardening.**

- `nonce: crypto.randomUUID()` on every `signinRedirect`; the library stores it and rejects an id_token whose claim differs ([REQ-PARAM-00/01](#gt-sso-requirements)).
- `revokeTokensOnSignout: true` for RFC 7009 revocation on logout ([REQ-TOKEN-05](#gt-sso-requirements)), access token only: revoking the refresh token makes Keycloak end the session before the end_session redirect arrives, which skips the brokered IdP logout, and the refresh token dies with the session anyway.
- One module-scope UserManager passed through `AuthProvider`'s `userManager` prop, removing the StrictMode duplicate-renew mechanism.
- Silent renew stops after user inactivity, `VITE_RENEW_IDLE_CUTOFF_MS` defaulting to the doc's one hour so tests can shrink it ([REQ-TOKEN-01](#gt-sso-requirements)).
- On an api 401: one `signinSilent()` retry, then `signinRedirect()`.

**`AuthGate` starts `signinRedirect` itself on load** (2026-08-13), instead of waiting for a click. An invitation mail opens a tab whose user store is empty even beside a live session in another tab, so the visitor saw the welcome screen and then landed on the sample list instead of the invited sample. A live session now round-trips silently and an expired one still reaches the login page. Every `signinRedirect` sends `url_state` set to the visited path; `/auth/callback` reads it off `useAuth().user.url_state` and navigates there instead of always to `/`, `safeReturnPath` keeping it app-local and rejecting the callback route itself and anything off-origin.

Exception, right after an explicit sign-out: redirecting unconditionally would bounce a user `IdentityGate` rejects for an unsupported identity provider straight back into the same rejected login with no way out. A per-tab `sessionStorage` flag, set on sign-out and cleared on the next mount, skips the auto-redirect for that one render so the welcome screen shows instead.

**Guards built here, attached per route as endpoints land.** `requireRole(role)` reads `realm_access.roles` from the verified token and 403s otherwise ([REQ-TOKEN-04](#gt-sso-requirements)); ADR 0023 records why it stays unused. `requireActiveSession` forwards the presented bearer token to `/userinfo` for critical actions ([REQ-CRIT-01](#gt-sso-requirements)), introspection needing a confidential client we deliberately do not have; its URL derives from `OIDC_ISSUER` with an `OIDC_USERINFO_URI` override, following the JWKS pattern. Both attachment obligations are recorded in [security-backend.md](../../.claude/rules/security-backend.md).

**Deletion propagation ([REQ-USER-01](#gt-sso-requirements)) waits on GaiaData's signal.** The plan is `deactivateUser(sub)` plus a stale-account fail-safe with a configurable retention window, which works regardless of their mechanism; their answer only picks the transport adapter (backchannel logout, webhook, or polling).

**Keep react-oidc-context; no auth framework.** oidc-client-ts is the maintained successor of a library the doc itself trusts for state and nonce handling, and every gap found was configuration, not a library defect. Future user data is domain modeling keyed by `sub` ([REQ-OIDC-01](#gt-sso-requirements)), not a second auth system.

**GaiaData onboarding is config, not development.** [gaiadata-client-provisioning.md](../gaiadata-client-provisioning.md) is the request we send; the answers land in env (`VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `OIDC_ISSUER`, `OIDC_AUDIENCE`) and in rollout planning. Redirect URIs are exact, with no wildcard: the SPA always returns to origin + `/auth/callback` and deep links ride the `url_state` above.

## Consequences

- Dev exercises what prod enforces: audience, nonce, 5 minute tokens, single-use rotating refresh tokens. PKCE is enforced server-side (`pkce.code.challenge.method: S256`), so the e2e login breaks if the client stops sending it; the nonce is unit-asserted on `signinRedirect`, and `state` is how oidc-client-ts correlates the callback at all.
- Multi-tab sessions under rotation are a watched risk: sessionStorage is per tab but Keycloak keeps one live refresh token per client session, so one tab's renewal can invalidate the other's. Observe in dev, then decide (reuse tolerance, cross-tab coordination, or accept re-login).
- The password grant stops working everywhere, including dev tooling.
- Nothing waits on GaiaData except deploy values and rollout decisions.

## Amendment 2026-07-30: audience validation is opt-in, `azp` and `typ` stand in

The GaiaData test realm (`https://sso-test.earth-data.fr/realms/gaia-data`, client `formaterre-igsn`) exposes no dedicated audience scope, so its access tokens carry no `aud` claim we can require. `aud` validation therefore becomes opt-in, checked only when `OIDC_AUDIENCE` is set, and the mock realm drops its `igsn-api` audience mapper so dev matches GaiaData.

Residual risk: that realm is shared with other service providers, so signature plus `iss` alone would let any of their tokens, or any client's id_token replayed as a bearer, authenticate here and auto-provision an account. Two claim checks carry the audience's job instead: `azp` must equal `OIDC_CLIENT_ID`, the client the token was issued to, and `typ` must be `Bearer`, Keycloak marking id_tokens `ID`. Weaker than a dedicated audience, since it trusts Keycloak's non-standard `typ` claim and holds only while GaiaData keeps stamping both, so confirm them on a real GaiaData token at the first deploy; if either disappears every request 401s, a lockout rather than a bypass. Signature, `iss` and the RS256 pinning stay mandatory, and `exp` too: the `jwk` middleware only checks it when the claim is present, so the same claim check rejects a token carrying none.

A knowing deviation from [REQ-TOKEN-03/04](#gt-sso-requirements). When GaiaData ships an audience scope for the client, set `OIDC_AUDIENCE` per environment and restore the mock realm mapper; the `azp`/`typ` check can then go, with no other code change.

## GT-SSO requirements

The codes cited above and in the docs that link here, one line each; the GT-SSO PDF stays the authoritative text.

- REQ-FLOW-02: the ROPC / password grant is forbidden for web apps.
- REQ-TOKEN-01: access tokens live at most 5 minutes; apps renew them transparently, and an inactive app (idle open tab) must stop auto-renewing after one hour.
- REQ-TOKEN-02: refresh tokens are single-use (rotation), 30 minutes max for a SPA.
- REQ-TOKEN-03: the token audience is dedicated per service provider and per environment.
- REQ-TOKEN-04: the service provider fully validates the token: signature, exp, aud at minimum; iss and roles too for critical apps.
- REQ-TOKEN-05: call the RFC 7009 revocation endpoint on logout.
- REQ-PARAM-00: state and nonce are mandatory and random in the authorize request.
- REQ-PARAM-01: state and nonce are verified after the redirect.
- REQ-PARAM-02: redirect URI wildcards are allowed only as a path suffix.
- REQ-CONSENT-1: a detailed consent page for scopes needing user agreement, waivable inside one trust perimeter.
- REQ-OIDC-01: sub is the user's stable identifier and must match between id_token and userinfo.
- REQ-CRIT-01: critical actions (deletions, rights changes, invitations) revalidate the token live against Keycloak; a locally valid JWT is not enough.
- REQ-USER-01: an account deleted at the IdP is deactivated in every service provider: tokens revoked, local account disabled, personal data removed.
