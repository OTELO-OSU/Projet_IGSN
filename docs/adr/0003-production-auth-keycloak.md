# 3. Production authentication with Keycloak

## Status

Accepted. The browser login flow and a proof-of-concept protected API route
(`GET /me`) are implemented and covered end to end by the e2e suite. Real
protected endpoints and per-route role enforcement build on the same middleware.

## Context

Users sign in through Keycloak, which brokers to two identity providers:
institution (Shibboleth/SAML) and ORCID (OIDC). Keycloak provisions the account
on first login. The admin SPA (`react-oidc-context`) never talks to the IdPs
directly, only to Keycloak, so the same build runs in every environment.

Dev and e2e use a throwaway Keycloak imported from `keycloak/*.json` plus mock
IdPs (SimpleSAMLphp, a `mock-orcid` realm). Those files are insecure by design
(`sslRequired: none`, unsigned SAML, a local `test`/`test` admin) and are never
shipped. Production runs a separate, externally-managed Keycloak.

## Decision

**The SPA is env-driven.** `VITE_OIDC_AUTHORITY` and `VITE_OIDC_CLIENT_ID`
(`packages/admin/src/auth.ts`) are baked into the bundle at build time (Vite),
so pointing at a real Keycloak is a build-arg change, not a code change. Both are
wired as Docker `ARG`s in `packages/admin/Dockerfile`. `redirect_uri` and
`post_logout_redirect_uri` derive from `window.location.origin`, so any prod
domain works without config.

**Production uses an externally-managed Keycloak.** Ops provisions it (console,
Terraform, or a hardened realm import); we do not ship a prod realm file, to
avoid drift with the dev one. The required prod configuration is the dev realm
(`keycloak/realm-igsn.json`) with these deltas:

| Setting                              | Dev value        | Prod value                |
| ------------------------------------ | ---------------- | ------------------------- |
| realm `sslRequired`                  | `none`           | `external` (default)      |
| `igsn-admin` redirect/web-origins    | `localhost:3001` | real admin origin (https) |
| shibboleth `validateSignature`       | `false`          | `true`                    |
| shibboleth `wantAuthnRequestsSigned` | `false`          | `true`                    |
| shibboleth IdP metadata/cert         | SimpleSAMLphp    | real RENATER/eduGAIN IdP  |
| orcid endpoints + client             | mock-orcid realm | production ORCID app      |
| `test`/`test` user                   | present (admin)  | absent                    |

The IdP attribute mappers (email, given/family name), the first-broker-login
flow, and the `admin` realm role are the same as dev; copy them across.

**ORCID is a linking mechanism, not a standalone login.** A user must not create
an account via ORCID. They first sign in through RENATER, link their ORCID while
authenticated (Keycloak stores the federated-identity link), and only then may
sign in with ORCID, which authenticates the already-linked account. The link
cannot key on an ORCID-provided email: ORCID releases none, and auto-linking by
email from an untrusted IdP is an account-takeover vector. The linking feature
itself is out of scope for now. Until it ships:

- the admin SPA offers the ORCID sign-in button, but gates the app on the
  `identity_provider` token claim (a session-note protocol mapper on
  `igsn-admin`): an ORCID-authenticated session gets an access-denied screen,
  not the app (`auth-gate.tsx`). This is UX only; the real boundary is the
  broker rule below. Server-side enforcement follows with per-route roles.
- the prod ORCID broker MUST NOT auto-create accounts (no standalone ORCID
  first-broker-login), so a misconfigured realm cannot let users bypass RENATER.

**Admin role assignment is an open question.** Dev bakes a `test` admin user.
Prod has no local users, so admins get the `admin` role by some mechanism to be
decided: manual grant, group mapping, or an IdP-attribute-to-role mapper. This
must be settled before the admin persona ships.

**API token verification is implemented with `hono/jwk`.** The api verifies the
Keycloak access token (signature against the realm JWKS, `iss`, and `exp`, with
`alg` pinned to RS256) in `packages/api/src/auth/middleware.ts`, applied to the
protected `GET /me` route. No new dependency was needed: hono (already a
dependency) ships the `jwk` middleware, so the ladder stopped there rather than
adding `jose`. JWKS fetch URL (`OIDC_JWKS_URI`) is separate from the expected
issuer (`OIDC_ISSUER`) because in Docker the browser-facing issuer and the
api-to-Keycloak URL differ. The admin SPA attaches `auth.user.access_token` to
its calls (`packages/admin/src/api.ts`). Still to do per real endpoint: role
enforcement (read `realm_access.roles`) and 401 / silent-renew handling.

**Edge serving and CSP.** The built SPA is served by a static host/CDN or nginx
with SPA fallback and the headers from the infra security rule. The CSP
`connect-src` MUST include the Keycloak origin: `react-oidc-context` fetches the
authority's `.well-known`, token, userinfo, and JWKS endpoints, so `'self'`
alone breaks login.

## Consequences

Ready today: the full browser login/logout round-trip and a token-verified API
call, end to end (proven by e2e), once `VITE_OIDC_AUTHORITY` (and
`VITE_OIDC_CLIENT_ID` if it differs) point at a real Keycloak.

Not ready, and required before any protected feature ships: per-route role
enforcement, the prod edge server with headers and a Keycloak-aware CSP, and a
decision on admin-role assignment.

Ordered production checklist:

1. Provision the prod Keycloak (https, `sslRequired: external`,
   `registrationAllowed: false`).
2. Create the `igsn-admin` client: public, standard flow, PKCE `S256`,
   `directAccessGrantsEnabled: false`, redirect/web-origins set to the admin
   domain.
3. Configure the Shibboleth SAML broker with signature validation on, signed
   AuthnRequests, and the real IdP metadata/cert; register Keycloak's SP metadata
   (`.../realms/igsn/broker/shibboleth/endpoint`) with RENATER and opt into eduGAIN.
4. Configure the ORCID OIDC broker with the production ORCID app credentials and
   endpoints (the `ORCID_*` vars in `.env.example` are exactly this set), with
   account auto-creation OFF (ORCID links to a RENATER account, never creates one).
5. Recreate the IdP attribute mappers and first-broker-login flow.
6. Decide and implement admin-role assignment.
7. Build the admin image with `VITE_OIDC_AUTHORITY`/`VITE_OIDC_CLIENT_ID` in CD.
8. Serve the SPA from a static host/CDN with the infra headers and a CSP whose
   `connect-src` includes the Keycloak origin.
9. API JWT verification: done (`hono/jwk` on `GET /me`); add a role guard per
   protected route as real endpoints land.
10. Admin attaches the access token to API calls: done for `/me`; add 401 /
    silent-renew handling as CRUD lands.
11. Critical actions (deletions, rights changes, invitations) revalidate the
    session live via the userinfo guard before executing
    ([REQ-CRIT-01](0006-gaiadata-sso-compliance.md#gt-sso-requirements));
    local JWT validation alone is not enough for them.
12. If per-user data is ever persisted, propagate IdP account deletion
    ([REQ-USER-01](0006-gaiadata-sso-compliance.md#gt-sso-requirements)):
    deactivate the local account on signal, stale-account fail-safe as
    backstop. Transport (backchannel logout, webhook, polling) per GaiaData's
    answer.
