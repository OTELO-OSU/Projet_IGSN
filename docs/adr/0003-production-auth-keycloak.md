# 0003. Production authentication with Keycloak

## Status

Accepted. Amended by ADR 0006 (GaiaData's mutualized Keycloak is the production realm) and ADR 0020 (ORCID is an app-level link, not a Keycloak federated identity).

## Context

Users sign in through Keycloak, which brokers two identity providers: institution (Shibboleth/SAML over eduGAIN) and ORCID (OIDC). The admin SPA (`react-oidc-context`) never talks to the IdPs directly, only to Keycloak, so the same build runs in every environment.

Dev and e2e use a throwaway Keycloak imported from `keycloak/*.json` plus mock IdPs (SimpleSAMLphp, a `mock-orcid` realm). Those files are insecure by design (`sslRequired: none`, unsigned SAML, a local `test`/`test` admin) and are never shipped.

## Decision

**The SPA is env-driven.** `VITE_OIDC_AUTHORITY` and `VITE_OIDC_CLIENT_ID` (`packages/admin/src/auth/oidc-config.ts`) are baked into the bundle at build time and wired as Docker `ARG`s in `packages/admin/Dockerfile`, so pointing at a real Keycloak is a build-arg change, not a code change. `redirect_uri` and `post_logout_redirect_uri` derive from `window.location.origin`, so any prod domain works without config.

**Production uses an externally-managed Keycloak**, and we ship no prod realm file to avoid drift with the dev one. Provisioning it is configuration, not development: [gaiadata-client-provisioning.md](../gaiadata-client-provisioning.md) is the request we send and ADR 0006 records what the answers must satisfy. The dev-only traits that must never reach prod are `sslRequired: none`, the mock IdPs and the `test` user.

**API token verification uses `hono/jwk`**, in `packages/api/src/auth/middleware.ts`, with `alg` pinned to RS256 and the claim set ADR 0006 fixes. No new dependency was needed, since hono already ships the `jwk` middleware, so the ladder stopped there rather than adding `jose`. `OIDC_JWKS_URI` is separate from `OIDC_ISSUER` because in Docker the browser-facing issuer and the api-to-Keycloak URL differ. The admin SPA attaches `auth.user.access_token` to its calls (`packages/admin/src/api.ts`).

**The edge CSP `connect-src` MUST include the Keycloak origin.** `react-oidc-context` fetches the authority's `.well-known`, token, userinfo and JWKS endpoints, so `'self'` alone breaks login.

## Consequences

- The full browser login/logout round-trip and a token-verified API call work against any real Keycloak once the two `VITE_OIDC_*` values point at it, proven end to end by the e2e suite.
- ORCID was planned here as a Keycloak federated identity, gated so it could never create an account. ADR 0020 replaced that with a local `orcid` column and made ORCID a sign-in path for an already-declared iD.
- Admin-role assignment was left open here and answered by ADR 0023: a local `user.super_admin` boolean, since the realm is GaiaData's and cannot carry a role of ours.
- Live session revalidation for critical actions and IdP deletion propagation are obligations recorded in [security-backend.md](../../.claude/rules/security-backend.md), from ADR 0006's REQ-CRIT-01 and REQ-USER-01.
