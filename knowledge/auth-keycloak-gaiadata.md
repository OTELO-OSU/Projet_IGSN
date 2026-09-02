---
type: auth
title: Authentication through Keycloak
description: >-
  The admin SPA is env-driven OIDC against an externally-managed GaiaData
  Keycloak brokering eduGAIN and ORCID; the api verifies tokens with hono/jwk.
resource: packages/admin/src/auth/oidc-config.ts
tags:
  - auth
  - admin
  - api
  - infra
relations:
  - type: depends_on
    target: gaiadata-sso-compliance
  - type: depends_on
    target: user-store-and-ownership
status: stable
---

Users sign in through Keycloak, which brokers two identity providers: institution (Shibboleth/SAML over eduGAIN, brokered as `satosa`) and ORCID (OIDC). The admin SPA (`react-oidc-context` / oidc-client-ts) never talks to the IdPs directly, only to Keycloak, so the same build runs in every environment.

- **The SPA is env-driven.** `VITE_OIDC_AUTHORITY` and `VITE_OIDC_CLIENT_ID` (`packages/admin/src/auth/oidc-config.ts`) are baked in at build time and wired as Docker `ARG`s, so pointing at a real Keycloak is a build-arg change. `redirect_uri` and `post_logout_redirect_uri` derive from `window.location.origin`, so any domain works with no config; redirect URIs are registered exactly, with no wildcard.
- **Production and preprod use the externally-managed GaiaData mutualized Keycloak**, and no prod realm file ships. Provisioning it is configuration, documented in `docs/gaiadata-client-provisioning.md`, its requirements in [[gaiadata-sso-compliance]].
- **Dev and e2e** use a throwaway Keycloak imported from `keycloak/*.json` plus mock IdPs (SimpleSAMLphp, a `mock-orcid` realm), documented in `docs/dev-authentication.md`. Those files are insecure by design (`sslRequired: none`, unsigned SAML, a local `test`/`test` admin) and never ship. The mock realm mirrors GaiaData behaviour rather than its naming.
- **The api verifies tokens with `hono/jwk`** (`packages/api/src/auth/middleware.ts`), `alg` pinned to RS256, no extra dependency. `OIDC_JWKS_URI` is separate from `OIDC_ISSUER` because the browser-facing issuer and the api-to-Keycloak URL differ in Docker. The SPA attaches `auth.user.access_token` to its calls (`packages/admin/src/api.ts`).
- **The edge CSP `connect-src` MUST include the Keycloak origin**, `react-oidc-context` fetching the authority's `.well-known`, token, userinfo and JWKS endpoints.
- **Login is not a click.** `AuthGate` starts `signinRedirect` itself on load, so an invitation mail opened in a fresh tab round-trips a live session silently instead of showing the welcome screen. Every `signinRedirect` sends `url_state` set to the visited path, and `/auth/callback` navigates there, `safeReturnPath` keeping it app-local. Right after an explicit sign-out a per-tab `sessionStorage` flag skips that one auto-redirect, so a user `IdentityGate` rejects is not bounced back into the same rejected login.
- Local identity and rights are not in the token: see [[user-store-and-ownership]], [[user-moderation-super-admin]].
