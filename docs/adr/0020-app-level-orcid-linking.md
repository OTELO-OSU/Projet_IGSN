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

- Squatting risk, accepted by the product owner: anyone can declare an ORCID iD they do not own and thereby receive that iD's future logins. Verified ownership (an ORCID OAuth round-trip, or a Keycloak federated identity) is the known upgrade path.
- The Keycloak account created by an ORCID first-broker-login stays an empty shell; identity lives in the institution-provisioned local user row.
