# Dev authentication (Keycloak)

`make dev` also starts a [Keycloak](https://www.keycloak.org) at http://localhost:8080, preconfigured from [`keycloak/realm-igsn.json`](../keycloak/realm-igsn.json) via its native `--import-realm`.

| What             | Value                                               |
| ---------------- | --------------------------------------------------- |
| Realm            | `igsn`                                              |
| Admin console    | http://localhost:8080, `admin` / `admin`            |
| Admin SPA client | `igsn-admin` (public, PKCE, `localhost:3000/admin`) |
| Test user        | `test` / `test` (realm role `admin`)                |
| OIDC issuer      | http://localhost:8080/realms/igsn                   |

- Edit the realm file and restart to change clients or users.
- Token policy mirrors production (5 min access tokens, single-use 30 min refresh tokens, no password grant; GT-SSO recommendations, ADR 0006), so tests drive the real browser login.
- `KC_HOSTNAME` is pinned to `http://localhost:8080` so the issuer the browser sees matches the one the api calls `/userinfo` on (`requireActiveSession`, needed for accept/reject); preprod already sets this.

> Keycloak imports a realm only into an empty one (`IGNORE_EXISTING`), so run `docker compose -f docker-compose.dev.yml down` after editing a realm file, before `make dev` / `make auth`.

## Federated login (Shibboleth + ORCID)

- Users don't self-register: one sign-in button lands on Keycloak's login page, the user picks a brokered identity provider, and Keycloak provisions the account on first login (first-broker-login).
- The SSO owns that provider list, so the app sends no `kc_idp_hint`, and GaiaData offers different providers than the mock realm.

| Provider    | Keycloak broker | Dev IdP                                | Prod IdP                     |
| ----------- | --------------- | -------------------------------------- | ---------------------------- |
| Institution | SAML (`satosa`) | SimpleSAMLphp at http://localhost:8081 | RENATER / eduGAIN Shibboleth |
| ORCID       | OIDC (`orcid`)  | Mock `mock-orcid` Keycloak realm       | ORCID production             |

- `make dev` brings both dev IdPs up, `make auth` starts just Keycloak and the SAML IdP.
- Both dev IdPs are faked locally, so dev and CI need no external account.
- The app only ever talks to Keycloak, so the same build runs everywhere and only each broker's target IdP changes, via env vars (prod overrides them, dev falls back to the mocks).
- The broker alias reaches the app in the `identity_provider` claim, whose case differs per environment (`orcid` on the mock realm, `ORCID` on GaiaData), so the admin gate and the api both match it case-insensitively.
- The api's match keeps an ORCID session off the email upsert (ADR 0020), which a case-sensitive comparison would break by handing over the account matching the token's email.
- The institution alias was renamed `shibboleth` -> `satosa` to match GaiaData, so a dev account imported before the rename keeps the old federated link until you re-import.
- `currentUser` refuses a login whose `identity_provider` claim is missing or outside `OIDC_ALLOWED_IDENTITY_PROVIDERS`, before any lookup or write.
- That list is comma-separated and case-insensitive, defaulting to `satosa,orcid` (also the fallback when it is empty or whitespace-only), so GaiaData's own MyAccessID broker and self-registration are refused.
- A Keycloak-local account like `test` / `test` carries no such claim at all, so it is the fixture for the two refusal scenarios in [`e2e/admin/auth.spec.ts`](../e2e/admin/auth.spec.ts).
- **SAML** users live in [`saml-idp/authsources.php`](../saml-idp/authsources.php) and release a French researcher profile (eduPersonPrincipalName, email, name), so login completes without prompts.
- The SAML broker skips signature validation in dev, and only the IdP metadata/SSO URL changes for prod.
- **ORCID** is mocked by the [`mock-orcid`](../keycloak/mock-orcid-realm.json) realm playing the OIDC provider, so no external account or approval is needed.
- Its endpoints and credentials are env vars ([`.env.example`](../.env.example)) defaulting to that mock, so leave them unset in dev.
- Like real ORCID, the mock releases no email: accounts carry a placeholder one only so their own realm asks nothing at login, and the `openid profile` broker scope never releases it.
- The `orcid` broker's custom first-broker-login flow creates the shell account silently, since the api's orcid lookup alone decides app access (ADR 0020).
- To test against real ORCID (sandbox or prod), register an app with redirect URI `http://localhost:8080/realms/igsn/broker/orcid/endpoint` and set the `ORCID_*` vars in `.env`, the same vars prod sets.

### Test identities

- Every user shares one password, `KEYCLOAK_PASSWORD` (dev/e2e default `password`).
- The three people with an ORCID iD are the same accounts on both providers, so an ORCID login can link to an existing institution account.

| Person         | Institution login (SAML) | ORCID iD              |
| -------------- | ------------------------ | --------------------- |
| Marie Dupont   | `marie.dupont`           | `0000-0001-5109-370X` |
| Jean Martin    | `jean.martin`            | `0000-0002-1694-2333` |
| Sophie Bernard | `sophie.bernard`         | `0000-0002-1825-0097` |
| Pierre Durand  | `pierre.durand`          | none                  |
| Camille Petit  | `camille.petit`          | none                  |
| Luc Moreau     | `luc.moreau`             | none                  |

- An ORCID sign-in only reaches the app once an account declared that iD: sign in through the institution first, set it on the Settings page, and the ORCID login then resolves to the same account (ADR 0020).
- Every seed gives each sample exactly one owner, and the api adopts it by matching the token's email on first sign-in (ADR 0019).
- `make db-seed` and the E2E reset name that owner in the seed data, and Luc Moreau owns none there, so ownership isolation stays testable.
- The demo set round-robins over the database's `accepted` users instead, so it seeds any environment: there Luc Moreau and Nadia Leroy do own samples, and the pending Théo Roux none.
- `make db-seed-demo` passes `--with-users` to create the mock researchers first, while `seed:demo` without it creates no user and exits when no accepted one exists.
- The six researchers above are seeded `accepted` and can publish right away; three more identities exercise moderation (ADR 0023):

| Person       | Status                    | Notes                                                            |
| ------------ | ------------------------- | ---------------------------------------------------------------- |
| Nadia Leroy  | `accepted`, `super_admin` | No sample from `db-seed`; sees every user's at `/users`/`/admin` |
| Théo Roux    | `pending`                 | Only drafts from `db-seed`; banner shown, publish disabled       |
| Chloé Girard | `rejected`                | Locked out at sign-in; owns nothing                              |

- Marie Dupont is also a space manager over the OTELo OSU and over the "OZCAR-RI" and "GeoRift" manual groups (ADR 0030), the dual-manager case.
- Hugo Fournier is a `pending` account inside her scope (`institutionalOsu: "OTELo"`), a seed fixture with no [`authsources.php`](../saml-idp/authsources.php) entry, so he is deliberately impossible to sign in as.
- Pierre Durand is the other kind of space manager, managing the "ANR CritMet" and "ProfilLoire 2024" manual groups with no `/admin/users` access at all (ADR 0030).
- He curates them at `/manual-groups`, where he may associate and detach a member but neither create, rename nor delete a group.
- Both also see "Sample moderation" at `/samples/moderation`, listing and editing the drafts and published samples in their reach: OTELo-snapshotted samples for Marie, samples carrying one of his two groups for Pierre.
- That reach is read from the sample's own row, not its owner's, so it is unrelated to which users they moderate.

## Switching to the GaiaData SSO

- Uncomment the GaiaData block in `.env` (see `.env.example`) and restart the stack to log in against the real GaiaData test SSO.
- Test accounts are GaiaData self-registered accounts, and the mock users above do not exist there.
- `http://localhost:3000/admin/auth/callback` must be registered as redirect URI and `http://localhost:3000` as web origin on the `formaterre-igsn` client.
- Only the old `localhost:3001` pair is registered there today, so a GaiaData login fails until someone asks them to add the `/admin` mount.
- The mock realm no longer injects an `igsn-api` audience, for parity with GaiaData, which has none yet.
- `aud` validation is opt-in via `OIDC_AUDIENCE` (ADR 0006 amendment), skipped when unset.

## Production

- The admin SPA points at an externally-managed Keycloak via `VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` (see [`oidc-config.ts`](../packages/admin/src/auth/oidc-config.ts)).
- The realm files, the `test` user and the mock IdPs are **dev/e2e only and never shipped**, so the insecure-by-design bits (`sslRequired: none`, unsigned SAML, a local admin password) stay in that throwaway setup.
- Standing up the prod Keycloak is an ops task: register its SP metadata (`.../realms/igsn/broker/satosa/endpoint`) with RENATER, opt into eduGAIN, and point the ORCID broker at production ORCID.
