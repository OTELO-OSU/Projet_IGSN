# 2. Production authentication with Keycloak

## Status

Accepted for the login flow. The API-side pieces (token verification, token
forwarding) are deferred until the first protected endpoint exists.

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

| Setting                                  | Dev value        | Prod value                |
| ---------------------------------------- | ---------------- | ------------------------- |
| realm `sslRequired`                      | `none`           | `external` (default)      |
| `igsn-admin` `directAccessGrantsEnabled` | `true`           | `false`                   |
| `igsn-admin` redirect/web-origins        | `localhost:3001` | real admin origin (https) |
| shibboleth `validateSignature`           | `false`          | `true`                    |
| shibboleth `wantAuthnRequestsSigned`     | `false`          | `true`                    |
| shibboleth IdP metadata/cert             | SimpleSAMLphp    | real RENATER/eduGAIN IdP  |
| orcid endpoints + client                 | mock-orcid realm | production ORCID app      |
| `test`/`test` user                       | present (admin)  | absent                    |

The IdP attribute mappers (email, given/family name), the first-broker-login
flow, and the `admin` realm role are the same as dev; copy them across.

**Admin role assignment is an open question.** Dev bakes a `test` admin user.
Prod has no local users, so admins get the `admin` role by some mechanism to be
decided: manual grant, group mapping, or an IdP-attribute-to-role mapper. This
must be settled before the admin persona ships.

**API token verification is deferred, not skipped.** The API has no protected
endpoints yet (`app.ts` is placeholder routes), so it validates nothing today.
The first protected route MUST add middleware that verifies the Keycloak access
token (signature against `<authority>/protocol/openid-connect/certs`, plus
`iss`/`aud`/`exp`) and enforces the `admin` role. This needs a JWKS/JWT
verification dependency (e.g. `jose`); that choice is deferred to when the
endpoint lands, per the dependencies rule. The admin SPA must then attach
`auth.user.access_token` to its API calls and handle 401 / silent renew.

**Edge serving and CSP.** The built SPA is served by a static host/CDN or nginx
with SPA fallback and the headers from the infra security rule. The CSP
`connect-src` MUST include the Keycloak origin: `react-oidc-context` fetches the
authority's `.well-known`, token, userinfo, and JWKS endpoints, so `'self'`
alone breaks login.

## Consequences

Ready today: the full browser login/logout round-trip, end to end, once
`VITE_OIDC_AUTHORITY` (and `VITE_OIDC_CLIENT_ID` if it differs) point at a real
Keycloak.

Not ready, and required before any protected feature ships: API token
verification, SPA token forwarding, the prod edge server with headers and a
Keycloak-aware CSP, and a decision on admin-role assignment.

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
   endpoints (the `ORCID_*` vars in `.env.example` are exactly this set).
5. Recreate the IdP attribute mappers and first-broker-login flow.
6. Decide and implement admin-role assignment.
7. Build the admin image with `VITE_OIDC_AUTHORITY`/`VITE_OIDC_CLIENT_ID` in CD.
8. Serve the SPA from a static host/CDN with the infra headers and a CSP whose
   `connect-src` includes the Keycloak origin.
9. Add API JWT verification + role guard on the first protected route.
10. Attach the access token to admin API calls; handle 401 and silent renew.
