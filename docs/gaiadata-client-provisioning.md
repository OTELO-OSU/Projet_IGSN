# GaiaData Keycloak client provisioning request

What we hand the GaiaData/GT-SSO team to onboard the IGSN apps on the
mutualized Keycloak, per their Recommandations Client v1.3. Values in angle
brackets are placeholders; `<prod-domain>` is the production zone (operator
held, not committed, same scheme as preprod's `DOMAIN`).

## Environments

Production only. Local dev and preprod run their own throwaway Keycloak
(`igsn-auth.<preprod-domain>`, imported from `keycloak/*.json`) and never
touch GaiaData.

Question to GaiaData: is there an INT environment? If yes, we onboard a
rehearsal build first, same shape as below with their `-int` naming.

## Client

| Setting                   | Value                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| client_id                 | `igsn-admin` (proposal; their naming convention wins)                                                       |
| Name                      | IGSN Admin SPA                                                                                              |
| Protocol / type           | OpenID Connect, public (no client_secret)                                                                   |
| Flows                     | Standard flow only; implicit OFF, direct access grants OFF, service accounts OFF, device OFF                |
| PKCE                      | required, `pkce.code.challenge.method: S256`                                                                |
| Redirect URIs             | `https://igsn-admin.<prod-domain>/` (exact, no wildcard)                                                    |
| Post-logout redirect URIs | `https://igsn-admin.<prod-domain>/`                                                                         |
| Web origins               | `https://igsn-admin.<prod-domain>`                                                                          |
| Scopes                    | `openid profile email`; no `offline_access`                                                                 |
| Refresh tokens            | issued to this public client, their rotation policy (doc SPA line: 5 min access, 30 min single-use refresh) |

The SPA always returns to origin + `/` (`redirect_uri` derives from
`window.location.origin`), so exact URIs suffice: stricter than the
suffix-wildcard
[REQ-PARAM-02](adr/0006-gaiadata-sso-compliance.md#gt-sso-requirements)
allows. Deep links ride the oidc `state`, not the redirect URI.

## Audience ([REQ-TOKEN-03](adr/0006-gaiadata-sso-compliance.md#gt-sso-requirements))

A dedicated client scope, default on `igsn-admin`, adding the api audience.
Proposed `igsn-api`; an env-suffixed name per their convention
(`igsn-api-prod` style) is fine. The api validates this exact value
(`OIDC_AUDIENCE`).

## Claims the apps consume

| Claim                                 | Use                                                           |
| ------------------------------------- | ------------------------------------------------------------- |
| `sub`                                 | user reference key (api, future user store)                   |
| `name`, `email`, `preferred_username` | display; from the `profile` / `email` scopes                  |
| `realm_access.roles`                  | `admin` realm role (api role guard)                           |
| `identity_provider`                   | session-note protocol mapper; the SPA gates ORCID-only logins |

## Realm-level needs (beyond the client)

Per ADR 0003; this is the "who creates what" to settle:

- RENATER/eduGAIN Shibboleth broker: signature validation ON, signed
  AuthnRequests, real IdP metadata; register the SP endpoint
  (`.../realms/<realm>/broker/shibboleth/endpoint`) with RENATER.
- Single logout on that broker (the IdP metadata's SLO endpoint in
  `singleLogoutServiceUrl`). Without it Keycloak silently skips IdP logout on
  sign-out and the institution SSO session survives, so the next login
  re-authenticates without credentials.
- ORCID broker on the production ORCID app, account auto-creation OFF: ORCID
  links to an existing institution account, never creates one.
- First-broker-login flow and attribute mappers (email, given/family name).
- Realm role `admin` and its assignment mechanism (manual grant, group, or
  IdP-attribute mapper): decision pending.

## What we need back

None of this blocks development. The apps read issuer, client id, and
audience from env with local-dev defaults (`VITE_OIDC_AUTHORITY`,
`VITE_OIDC_CLIENT_ID`, api `OIDC_ISSUER` and `OIDC_AUDIENCE`); the answers
below fill the production deploy config and the rollout plan.

1. The three config values, per environment: issuer URL
   (`https://<host>/realms/<realm>`), client_id, audience (as a default
   scope on the client, not optional).
2. A test environment, if any (the GT-SSO doc calls it INT): a test instance
   of the mutualized Keycloak our staging build can log into, and how test
   logins work there (test IdP or seeded accounts). Decides whether we can
   rehearse the integration before production.
3. Effective token policy on our client (access lifespan, refresh lifespan,
   rotation on/off), to mirror in `keycloak/realm-igsn.json` so dev matches
   prod.
4. Consent page for `openid profile email`: enforced, or same-trust-perimeter
   waiver
   ([REQ-CONSENT-1](adr/0006-gaiadata-sso-compliance.md#gt-sso-requirements)).
   First-login UX only.
5. Governance model: dedicated realm we administer, or client in a realm
   they operate; if the latter, the request channel and turnaround (every
   redirect-URI change goes through it).
6. Broker plan: who configures the RENATER/eduGAIN and ORCID brokers and the
   first-broker-login mappers, who registers the SP metadata with RENATER,
   confirmation ORCID auto-create stays OFF.
7. Admin role assignment: who grants the `admin` realm role and how (manual,
   group, or IdP attribute).
8. Deletion signal: what exists when an account is deleted (backchannel
   logout, webhook, event bus, or a queryable API), for
   [REQ-USER-01](adr/0006-gaiadata-sso-compliance.md#gt-sso-requirements).
   Our stale-account fail-safe runs regardless; the answer only picks the
   transport adapter.
