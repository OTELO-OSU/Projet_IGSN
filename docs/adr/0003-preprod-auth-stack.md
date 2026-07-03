# 3. Preprod auth stack: dev Keycloak + mock SAML IdP

## Status

Accepted. Extends [ADR 0002 (production auth)](0002-production-auth-keycloak.md),
which governs true prod. This one covers preprod only.

## Context

Preprod mirrors the prod topology (apps + Postgres behind Caddy on one EC2 box) to
exercise flows before prod exists. Login brokers RENATER (SAML) and ORCID through
Keycloak. Registering with real RENATER/eduGAIN is a heavyweight external process,
not worth it for a throwaway preprod. ADR 0002 keeps the dev realm files out of prod
but leaves preprod undefined.

## Decision

Preprod runs the **same throwaway Keycloak as dev**: `start-dev --import-realm` from
`keycloak/*.json` (the igsn realm plus `mock-orcid`), alongside the mock SimpleSAMLphp
IdP. Keycloak is at `igsn-auth.$DOMAIN` and the IdP at `igsn-idp.$DOMAIN`, both proxied
by Caddy.

- **Behind Caddy.** `KC_HOSTNAME=https://igsn-auth.$DOMAIN` and `KC_PROXY_HEADERS=xforwarded`
  make Keycloak emit its public https URLs. The realm's `${ADMIN_REDIRECT_URI}` /
  `${ADMIN_WEB_ORIGIN}` / `${SHIBBOLETH_SSO_URL}` placeholders point at the preprod hosts.
- **Public/internal split.** The api verifies tokens against the public issuer
  (`OIDC_ISSUER`) but fetches JWKS over the compose network (`OIDC_JWKS_URI` ->
  `keycloak:8080`), same as dev. The admin bundle bakes `VITE_OIDC_AUTHORITY` at build
  time. ORCID follows the same split: browser-facing URLs public, backend calls over
  `localhost:8080`.
- **One password variable.** `KEYCLOAK_PASSWORD` is the Keycloak bootstrap-admin password
  and the shared password of the mock SAML and mock-orcid users. Dev/e2e default it to
  `password`; preprod sets a strong value in the host `docker-compose.env`.
- **Five mock RENATER users** in `saml-idp/authsources.php` log in as `firstname.lastname`,
  mirroring the eduPersonPrincipalName + email + name RENATER releases. The mock-orcid
  users reuse their names so an ORCID login represents the same person as a RENATER
  account (the linking case in ADR 0002).
- **State is ephemeral** (H2 in-memory): brokered users re-provision and the realm
  re-imports on each boot. Acceptable for staging.
- **ORCID sign-in stays gated** in the admin UI. Wiring the broker only makes preprod
  behave like dev; it does not enable ORCID as a login path.

## Consequences

Preprod carries the dev realm's insecure-by-design traits (`sslRequired: none`, a local
`test`/`test` admin, unsigned SAML). Intentional for staging, must not leak into prod:
**prod still follows ADR 0002** (external hardened Keycloak, real IdPs, no test user, no
mock). If preprod ever needs durable Keycloak state, switch it from `start-dev` (H2) to
`start` against Postgres.
