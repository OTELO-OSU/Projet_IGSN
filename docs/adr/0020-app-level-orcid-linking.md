# 20. App-level ORCID linking and login

## Status

Accepted. Amends the linking mechanism sketched in ADR 0003.

## Context

ADR 0003 planned the ORCID-to-account link as a Keycloak federated identity.
That keeps the link inside Keycloak, but it needs a Keycloak account-linking
flow, is invisible to the app, and cannot be listed, audited, or cleared from
the registry itself.

## Decision

The link is a nullable, unique `orcid` column on the `user` table.

- A signed-in researcher declares their ORCID iD on the admin Settings page
  (`PUT /admin/me/orcid`). Free text, validated by format only (`orcidSchema`);
  ownership of the iD is NOT verified. Clearing it (null) removes the link.
- Setting it is rights-granting (it creates a sign-in path), so the endpoint
  revalidates the session live (`requireActiveSession`, GaiaData REQ-CRIT-01).
- An ORCID sign-in resolves strictly by this column: `currentUser` looks up the
  token's `preferred_username` (Keycloak brokers ORCID accounts with the iD as
  username) and refuses the request when no user declared it. This branch runs
  BEFORE the email upsert: the first-broker-login profile step lets the user
  type any email, so upserting by it would hand over the matching account.
  ORCID logins never provision or refresh a local user.
- The unique constraint is the single arbiter of "one ORCID, one account";
  `setOrcid` maps a taken iD to a 409.

## Consequences

- Squatting risk, accepted by the product owner: anyone can declare an ORCID
  iD they do not own and thereby receive that iD's future logins. Verified
  ownership (an ORCID OAuth round-trip or Keycloak federated identity) is the
  known upgrade path if the risk stops being acceptable.
- The Keycloak account created by an ORCID first-broker-login stays an empty
  shell; identity lives in the institution-provisioned local user row.
