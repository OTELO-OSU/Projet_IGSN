# 0036. Service account owner and API key

Date: 2026-09-08

## Status

Accepted. Amended 2026-09-10: `GET /service/ping` is deleted, `GET /service/samples` having become the mount's route and the proof that a key works. Amended again 2026-09-10: that list defaults to every published sample rather than the account's own reach, `?editable=true` narrowing it to `managerScope`, and it emits the two archive contacts unredacted, a product-owner decision taken because the IGSN Core mapping will not expose them. Scoping by default with an `?all=true` to widen was rejected: an external service reads the registry, so the narrow view is the exception. Amended 2026-09-11: `POST /service/samples` creates and publishes a sample in one transaction, `samplePublishBlockers` run before the insert (422 `{ error: "Sample is not ready to publish", blockers }` and nothing stored on failure), owned by the service account's owner and snapshotting the account's own institutional trio, not the owner's, so it shows under `?editable=true`. Manual groups and any parent are checked against the owner as a plain user, never super admin (422 `Manual group not attachable to this sample`, 422 `Parent sample not eligible`), and no `publisher` argument is needed since `findByApiKeyHash` already requires an accepted owner. A body naming a parent and a location answers 400, since a sub-sample inherits its parent's location as is, and the blockers read that parent's location. A body the schema refuses answers 400 `{ error: "Invalid sample", issues: [{ path, message }] }`, since a script has no form to point at the failing field; the admin route shares that validator and body.

## Context

ADR 0035 declared the `service_account` entity but deferred its credential and any machine API: nothing recorded who a service account is for, and a created account could call nothing. A researcher must be able to ask for one, own it, and hold a credential a script can send.

## Decision

**Every service account has a required owner**, `owner_id uuid not null references user(id) on delete cascade`.

- A service exists in a user's name, so it dies with that user's account.
- The migration deletes the existing `service_account` rows first, test data only (PO decision).
- The model exposes `owner: UserIdentity` read back in one query; the request body takes `ownerId` and answers 404 `Owner not found` for an unknown user.
- The owner must be an accepted user: the body answers 404 for a pending or rejected one, and a key whose owner is no longer accepted answers 403 like an unknown key, so revoking the researcher revokes their services.

**The credential is a 256-bit random `base64url` key, stored as its SHA-256 hex digest**, unique-indexed, and shown once.

- `node:crypto` only (`randomBytes`, `createHash`), no dependency.
- Generating a key replaces the hash, so the previous key dies with it: one column, no key history.
- Only the owner rotates a key (`POST /admin/currentUser/service-accounts/:id/api-key`, 404 outside their own accounts); a super admin gets no key button.
- The plain key is never stored nor logged: the rotation log records the actor and the account id only.

**`/service` is the machine API mount**, guarded by `requireServiceAccount` and rate-limited by IP like the other unauthenticated-by-JWT surfaces.

- It carries one route, `GET /service/ping` answering `{ ok: true }`, so the credential is provable before any data route exists.
- A missing header and an unknown key both answer **403** (PO decision): the caller is not a session to renew, and 403 tells a script nothing about whether the key exists.
- The middleware sets the whole `ServiceAccount` on the context, so a future data route reads its groups (`managerScope` + `moderatedSampleWhere`) with no extra lookup.

## Rejected alternatives

**Keycloak client credentials.** ADR 0035 keeps service accounts out of Keycloak, so a service would need a client, a mapper and a realm role to carry its groups, and the api would still resolve them against its own table. One hashed column reuses the reach it already has.

**Salted password hashing (bcrypt/argon2).** A salt and a work factor defend a low-entropy human secret against a dictionary. A 256-bit random key has no dictionary, so SHA-256 is enough and stays a single indexed lookup per request.

**Several live keys per account.** Rotation without downtime would need a key table. No service asked, and one column plus a rotate button covers the leak case.
