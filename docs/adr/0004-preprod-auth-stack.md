# 4. Preprod auth stack: dev Keycloak + mock SAML IdP

## Status

Superseded for preprod by the 2026-08-14 amendment below: preprod no longer
deploys either service. Extends [ADR 0003 (production auth)](0003-production-auth-keycloak.md),
which governs true prod. The decision below still describes the dev and e2e
stacks, which keep both.

## Context

Preprod mirrors the prod topology (apps + Postgres behind Caddy on one EC2 box) to
exercise flows before prod exists. Login brokers RENATER (SAML) and ORCID through
Keycloak. Registering with real RENATER/eduGAIN is a heavyweight external process,
not worth it for a throwaway preprod. ADR 0003 keeps the dev realm files out of prod
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
  account (the linking case in ADR 0003).
- **State is ephemeral** (H2 in-memory): brokered users re-provision and the realm
  re-imports on each boot. Acceptable for staging.
- **ORCID sign-in stays gated** in the admin UI. Wiring the broker only makes preprod
  behave like dev; it does not enable ORCID as a login path.

## Consequences

Preprod carries the dev realm's insecure-by-design traits (`sslRequired: none`, a local
`test`/`test` admin, unsigned SAML). Intentional for staging, must not leak into prod:
**prod still follows ADR 0003** (external hardened Keycloak, real IdPs, no test user, no
mock). If preprod ever needs durable Keycloak state, switch it from `start-dev` (H2) to
`start` against Postgres.

## Amendment 2026-08-14: preprod deploys no identity provider of its own

GaiaData's test SSO is now preprod's only identity provider, so the throwaway
Keycloak and the mock SimpleSAMLphp IdP are removed from
`infra/preprod/docker-compose.yml`. `api` already verified against
`https://sso-test.earth-data.fr/realms/gaia-data`, so both services were inert;
they stood only as the rollback path this ADR described, and that path is gone.

- The `igsn-auth.$DOMAIN` and `igsn-idp.$DOMAIN` Caddy sites, the `KEYCLOAK_PASSWORD`
  env var, and the `scp` of `keycloak/`+`saml-idp/` in `deploy.sh` go with them.
- `deploy.sh` runs `up -d --remove-orphans`, so the next deploy tears the two
  containers off the host with no manual step.
- **Dev and e2e keep both services and both directories**, so local auth testing
  is unchanged. This is a deliberate divergence from
  [infra-parity](../../.claude/rules/infra-parity.md): the rule mirrors a runtime
  requirement into every stack, and here the requirement exists only outside
  preprod.
- Restoring preprod's own stack means restoring this ADR's decision, not writing
  a new one.
