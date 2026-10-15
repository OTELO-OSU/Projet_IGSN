# 0020. App-level ORCID linking and login

## Status

Accepted. Amends the linking mechanism sketched in ADR 0003.

## Context

ADR 0003 planned the ORCID-to-account link as a Keycloak federated identity. That keeps the link inside Keycloak, but it needs a Keycloak account-linking flow, is invisible to the app, and cannot be listed, audited, or cleared from the registry itself.

## Decision

The link is a nullable, unique `orcid` column on the `user` table.

- A signed-in researcher declares their ORCID iD on the admin Settings page (`PUT /admin/currentUser/orcid`). It is free text validated by format only (`orcidSchema`), ownership of the iD NOT being verified, and clearing it removes the link.
- Setting it is rights-granting, since it creates a sign-in path, so the endpoint revalidates the session live (`requireActiveSession`, GaiaData REQ-CRIT-01).
- **An ORCID sign-in resolves strictly by this column.** `currentUser` looks up the token's `identity_provider_identity` (the session note holding the iD the broker authenticated, mapped as a claim on `igsn-admin`) and refuses the request when no user declared it. `preferred_username` is the Keycloak shell account's own name, which production ORCID does not fill with the iD.
- That branch runs BEFORE the email upsert: a broker-supplied email is user-controlled, so upserting by it would hand over the matching account. ORCID logins never provision or refresh a local user.
- The lookup uppercases the claim, since the GaiaData SSO hands the identity over lowercased and the checksum letter X is the only character of an ORCID iD carrying a case, so an iD ending in X would otherwise never match the stored value, which `orcidSchema` keeps uppercase.
- The `orcid` broker uses a dedicated first-broker-login flow with no review-profile step, so the Keycloak shell account is created silently and without an email, nothing in the app reading it.
- The unique constraint is the single arbiter of "one ORCID, one account", `setOrcid` mapping a taken iD to a 409.

## Consequences

- Squatting risk, accepted by the product owner: anyone can declare an ORCID iD they do not own and thereby receive that iD's future logins. Verified ownership (an ORCID OAuth round-trip, or a Keycloak federated identity) is the known upgrade path. Closed for new links by the 2026-10-15 amendment.
- The Keycloak account created by an ORCID first-broker-login stays an empty shell; identity lives in the institution-provisioned local user row.

## Amendment 2026-10-15: the link is verified through an ORCID round-trip

The free-text declaration and its accepted squatting risk no longer hold for new links; the column, the strict ORCID sign-in lookup and the 409 on a taken iD stand.

- Profile (`/settings/profile`) takes no typed iD: "Link my ORCID account" sends the user to ORCID (`scope=openid`, `prompt=login`), the `state` kept in the tab's sessionStorage and checked on return, and ORCID redirects back to `ADMIN_URL/settings/profile`.
- `GET /admin/currentUser/orcid/authorization?state=` answers `{ url }`.
- `PUT /admin/currentUser/orcid` takes `{ code }`: the api exchanges it with its own confidential ORCID client (`client_secret_post`) and stores the id_token `sub` through `orcidSchema`.
- The `sub` is read unsigned straight from the token endpoint, which OIDC Core 3.1.3.7 allows.
- Errors: 409 iD held elsewhere, 400 ORCID refused the code, 502 ORCID down or bad `sub`.
- `DELETE /admin/currentUser/orcid` unlinks (204).
- Both writes keep `requireActiveSession`.
- Unlink is disabled in the UI only while the session itself came through ORCID.
- iDs typed before this change are kept, unverified until unlinked and relinked.
- The api reads its own `ORCID_LINK_CLIENT_ID`, `ORCID_LINK_CLIENT_SECRET`, `ORCID_LINK_AUTHORIZATION_URL` and `ORCID_LINK_TOKEN_URL`, apart from the Keycloak broker's `ORCID_*`, so dev links through real ORCID while the broker stays on the local mock.
- Each ORCID client must register the admin `/settings/profile` URL as a redirect URI.
