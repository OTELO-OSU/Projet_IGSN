---
type: auth
title: App-level ORCID linking and login
description: >-
  The ORCID link is a nullable unique orcid column declared by the researcher;
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

- A signed-in researcher declares their iD on the admin Settings page (`PUT /admin/currentUser/orcid`), validated by format only (`orcidSchema`); ownership of the iD is NOT verified, and clearing it removes the link.
- Setting it is rights-granting, since it creates a sign-in path, so the endpoint revalidates the session live (`requireActiveSession`, REQ-CRIT-01).
- **An ORCID sign-in resolves strictly by this column.** `currentUser` looks up the token's `identity_provider_identity` (the session note holding the iD the broker authenticated, mapped as a claim) and refuses the request when no user declared it. `preferred_username` is the Keycloak shell account's own name, which production ORCID does not fill.
- That branch runs BEFORE the email upsert: a broker-supplied email is user-controlled, so upserting by it would hand over the matching account. ORCID logins never provision or refresh a local user.
- The lookup uppercases the claim, GaiaData handing the identity over lowercased while the checksum letter X is the one case-carrying character of an iD.
- The `orcid` broker uses a dedicated first-broker-login flow with no review-profile step, so the Keycloak account is created silently, without an email, and stays an empty shell; identity lives in the institution-provisioned local row.
- The unique constraint is the single arbiter of "one ORCID, one account", `setOrcid` mapping a taken iD to a 409.
- Accepted squatting risk: anyone can declare an iD they do not own and receive its future logins. Verified ownership (an ORCID OAuth round-trip) is the known upgrade path.
