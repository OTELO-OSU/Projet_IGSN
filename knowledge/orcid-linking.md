---
type: auth
title: App-level ORCID linking and login
description: >-
  The ORCID link is a nullable unique orcid column verified by an ORCID round-trip;
  an ORCID sign-in resolves strictly by it and never provisions an account.
resource: packages/api/src/user/set-orcid.ts
tags:
  - auth
  - user
  - orcid
relations:
  - type: depends_on
    target: user-store-and-ownership
  - type: depends_on
    target: auth-keycloak-gaiadata
status: stable
---

The ORCID-to-account link is a nullable, unique `orcid` column on the `user` table, not a Keycloak federated identity, so the registry can list, audit and clear it.

- A signed-in researcher links their iD from Profile (`/settings/profile`) through an ORCID round-trip: `GET /admin/currentUser/orcid/authorization?state=` answers `{ url }` (`scope=openid`, `prompt=login`, `state` kept in the tab's sessionStorage), ORCID redirects back to `ADMIN_URL/settings/profile`, and `PUT /admin/currentUser/orcid` takes `{ code }`.
- The api exchanges the code with its own confidential client (`client_secret_post`, `ORCID_LINK_CLIENT_ID`, `ORCID_LINK_CLIENT_SECRET`, `ORCID_LINK_AUTHORIZATION_URL`, `ORCID_LINK_TOKEN_URL`, apart from the Keycloak broker's `ORCID_*`) and stores the unsigned id_token `sub` (OIDC Core 3.1.3.7) through `orcidSchema`.
- The PUT answers 409 iD held elsewhere, 400 code refused, 502 ORCID down or bad `sub`; `DELETE /admin/currentUser/orcid` unlinks (204).
- iDs typed before the round-trip existed are kept, unverified until unlinked and relinked.
- Setting it is rights-granting, since it creates a sign-in path, so the endpoint revalidates the session live (`requireActiveSession`, REQ-CRIT-01).
- **An ORCID sign-in resolves strictly by this column.** `currentUser` looks up the token's `identity_provider_identity` (the session note holding the iD the broker authenticated, mapped as a claim) and refuses the request when no user declared it. `preferred_username` is the Keycloak shell account's own name, which production ORCID does not fill.
- That branch runs BEFORE the email upsert: a broker-supplied email is user-controlled, so upserting by it would hand over the matching account. ORCID logins never provision or refresh a local user.
- The lookup uppercases the claim, GaiaData handing the identity over lowercased while the checksum letter X is the one case-carrying character of an iD.
- The `orcid` broker uses a dedicated first-broker-login flow with no review-profile step, so the Keycloak account is created silently, without an email, and stays an empty shell; identity lives in the institution-provisioned local row.
- The unique constraint is the single arbiter of "one ORCID, one account", `setOrcid` mapping a taken iD to a 409.
- The old squatting risk (a free-text iD) is closed for new links by the verified round-trip.
