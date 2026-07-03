# Dev authentication (Keycloak)

`make dev` also starts a [Keycloak](https://www.keycloak.org) at http://localhost:8080,
preconfigured from [`keycloak/realm-igsn.json`](../keycloak/realm-igsn.json) via Keycloak's
native `--import-realm` — no manual setup.

| What             | Value                                         |
| ---------------- | --------------------------------------------- |
| Realm            | `igsn`                                        |
| Admin console    | http://localhost:8080 — `admin` / `admin`     |
| Admin SPA client | `igsn-admin` (public, PKCE, `localhost:3001`) |
| Test user        | `test` / `test` (realm role `admin`)          |
| OIDC issuer      | http://localhost:8080/realms/igsn             |

Edit the realm file and restart to change clients/users. Token policy mirrors
production (5 min access tokens, single-use 30 min refresh tokens, no password
grant; GT-SSO recommendations, see ADR 0003), so tests drive the real browser
login.

## Federated login (Shibboleth + ORCID)

Users don't self-register. They sign in through one of two brokered identity providers,
and Keycloak provisions the account on first login (first-broker-login):

| Provider    | Keycloak broker | Dev IdP                                | Prod IdP                     |
| ----------- | --------------- | -------------------------------------- | ---------------------------- |
| Institution | SAML            | SimpleSAMLphp at http://localhost:8081 | RENATER / eduGAIN Shibboleth |
| ORCID       | OIDC            | Mock `mock-orcid` Keycloak realm       | ORCID production             |

Both dev IdPs are faked locally, so dev and CI need no external accounts. The app only
ever talks to Keycloak, never to RENATER/ORCID directly, so the same build runs in every
environment; only which IdP each broker points at changes, via env vars (prod overrides
them, dev falls back to the mocks). `make dev` brings both IdPs up; `make auth` starts
just Keycloak + the SAML IdP.

### Test identities

Every user shares one password: `KEYCLOAK_PASSWORD` (dev/e2e default `password`). The
three people with an ORCID iD are the same accounts on both providers, so an ORCID login
can link to an existing institution account.

| Person         | Institution login (SAML) | ORCID iD              |
| -------------- | ------------------------ | --------------------- |
| Marie Dupont   | `marie.dupont`           | `0000-0001-5109-3700` |
| Jean Martin    | `jean.martin`            | `0000-0002-1694-2333` |
| Sophie Bernard | `sophie.bernard`         | `0000-0002-1825-0097` |
| Pierre Durand  | `pierre.durand`          | —                     |
| Camille Petit  | `camille.petit`          | —                     |

- **SAML** users are defined in [`saml-idp/authsources.php`](../saml-idp/authsources.php).
  They release a French researcher profile (eduPersonPrincipalName, email, name), so
  brokered login completes without prompts. The broker skips signature validation in dev;
  only the IdP metadata/SSO URL changes for prod.
- **ORCID** is mocked by the [`mock-orcid`](../keycloak/mock-orcid-realm.json) Keycloak
  realm playing the OIDC provider, so no external account or approval is needed. The
  `orcid` broker's endpoints and credentials are env vars ([`.env.example`](../.env.example))
  that default to this mock; leave them unset for dev. Like real ORCID, the mock releases
  no email, so first-broker-login prompts ORCID users for one. To test against **real
  ORCID** (sandbox or prod), register an app with redirect URI
  `http://localhost:8080/realms/igsn/broker/orcid/endpoint` and set the `ORCID_*` vars in
  `.env` — the same vars a prod deployment sets.

> Keycloak imports a realm only when it has no existing copy (`IGNORE_EXISTING`). After
> editing [`keycloak/realm-igsn.json`](../keycloak/realm-igsn.json) or the mock-orcid
> realm, run `docker compose -f docker-compose.dev.yml down` before `make dev`/`make auth`
> so the fresh container re-imports it.

In production the admin SPA points at an externally-managed Keycloak via
`VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` (see [`auth.ts`](../packages/admin/src/auth.ts)).
The realm files, the `test` user, and the mock IdPs here are **dev/e2e only and are never
shipped** — the insecure-by-design bits (`sslRequired: none`, unsigned SAML, a local admin
password) live only in that throwaway setup. Standing up the prod Keycloak is an ops task:
register its SP metadata (`…/realms/igsn/broker/shibboleth/endpoint`) with the RENATER
federation, opt into eduGAIN, and configure the ORCID broker against production ORCID.
