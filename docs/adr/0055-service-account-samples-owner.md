# 0055. Service account samples owner

Date: 2026-10-06

## Status

Accepted. Supersedes in part ADR [0035](0035-service-accounts.md) (the stored institutional trio) and ADR [0036](0036-service-account-api-key.md) (the account's owner owning created samples, the account's own trio, who may request one).

## Context

ADR 0036 gave a service account one person, its `owner`, who held the key and owned every sample created through `/service`, while the samples snapshotted the trio stored on the account itself.

- One person could not be both the key holder and the owner of the samples when a lab asks a service to deposit under another member's name.
- A trio stored beside the owner's own drifted from the people the samples are attributed to.
- Any accepted user could ask for an account, with no bound on whose samples it could create.

## Decision

**A service account has two people.**

- `owner` is the key holder, shown as "Requested by" in the admin, who alone rotates the API key from Settings > Services.
- `sampleOwner` is the samples owner: every sample created through `/service` is owned by them.
- Both are required and may be the same user.

**The account stores no institutional trio.**

- The columns are dropped by `20261006080000-service-account-sample-owner.ts`.
- The model exposes the samples owner's trio, nullable, and a created sample snapshots that trio at creation.
- The super admin form lost its Institution section and gained a required "Samples owner".

**Only a super admin or a space manager may ask for an account.**

- `POST /admin/currentUser/service-accounts/requests` and `GET .../requestable-groups` answer 403 to anyone else (`requireUserModeration`), and the admin hides the ask button with `canAdminManualGroups`.
- The samples owner is picked among the requester's group members: `GET /admin/users/search?inMyGroups=true` returns the members of the managed labs or managed manual groups, any accepted user for a super admin, 403 for a non-manager.
- The api re-checks that reach and answers 422 "Samples owner out of reach".
- The request mail names the samples owner.
- Validating a request stays super admin only.

## Rejected alternatives

**Keep the stored trio.** It duplicated what the samples owner already records and let the two disagree.

**One person for both roles.** It forced the key holder to own the samples, so a manager could not run a service for a colleague's deposits, and it left no reach to bound.

## Consequences

- A samples owner with no trio yields samples with no trio, the model's nullable trio showing it.
- A manager's reach bounds who a service can deposit for, not what it reads: `managerScope` is unchanged.
