# 0036. Service account owner and API key

Date: 2026-09-08

## Status

Accepted, then amended.

### 2026-09-10, `GET /service/samples`

- It replaces `GET /service/ping`, deleted, as the mount's route and the proof that a key works.
- It lists every published sample, `?editable=true` narrowing it to `managerScope`; scoping by default with an `?all=true` to widen was rejected, an external service reads the registry.
- It emits the two archive contacts unredacted, a PO decision, the IGSN Core mapping not exposing them.

### 2026-09-11, `POST /service/samples`

- It creates and publishes in one transaction, owned by the account's owner and snapshotting the account's own institutional trio, not the owner's, so it shows under `?editable=true`.
- The service sees no status and no draft, so the admin's publish vocabulary never reaches it.
- Every refusal answers one shape, 422 `{ error: "Invalid sample", issues: [{ path?, code, message? }] }`, listing every problem at once.
- `code` is a zod issue code with zod's `message`, or a `samplePublishBlockers` code with its path from `publish-blocker-path.ts`.
- `parent_not_found` covers a non-uuid, unknown, draft or out-of-reach parent alike, so the route is no existence oracle.
- Two codes are this route's own request-shape rules: `location_inherited_from_parent` at `location`, a sub-sample inheriting its parent's location, and `manual_group_not_attachable` at `manualGroupIds.<i>`.
- `createServiceSampleSchema` (`domain/service-account/service-sample-validator.ts`) is `createSampleSchema` with `parentIds` widened to any string for that reason.
- Manual groups and the parent are checked against the owner as a plain user, never super admin.

### 2026-09-11, `PUT /service/samples/:igsn`

- It updates a published sample inside `managerScope`, 404 for an unknown or non-published IGSN (withdrawn included), 403 `{ error: "Forbidden" }` outside that reach.
- `updateServiceSampleSchema` is `updateSampleSchema` with `attachments` refused.
- Unlike the admin route's merge-not-reject (ADR [0021](0021-post-publish-field-mutability.md)), a frozen field sent with a different value answers 403 `{ error: "Forbidden", issues: [{ path, code: "field_frozen" }] }`, nothing written, both reading the same lock maps.
- A frozen field omitted keeps its stored value, asking a script for a value it cannot change being pointless.
- A newly introduced publish blocker answers the same 422, via `newPublishBlockers`, shared with the admin route's 409 check.
- No `expectedUpdatedAt` stale check, no edit lock, no moderation mail, no attachments reconcile.

### 2026-09-14

- `POST /service/samples` accepts up to two parents (ADR [0039](0039-two-parent-sub-samples.md)), `parent_not_found` naming the failing index and location inherited only when there is exactly one parent.
- The four routes emit and accept IGSN Sample Core v0.10.0 records instead of the internal `Sample` shape, every path travelling out as its Core path, so `parent_not_found` sits at `relations.<i>.targetIdentifier.value`; see ADR [0040](0040-igsn-core-pivot-on-service-api.md).

### 2026-09-15

- The four routes are declared through `@hono/zod-openapi`, publishing `GET /service/docs` and `GET /service/openapi.json` ahead of the API-key guard; see ADR [0041](0041-openapi-for-the-service-api.md).
- A `POST`/`PUT` with a missing or non-JSON `Content-Type` now answers 415 `{ error: "Unsupported Media Type" }` instead of 422 `Invalid sample`.

### 2026-09-23

- `POST` and `PUT` refuse a record suspected to duplicate a published sample (same name, material and collector), answering 409 `{ error, reason: "duplicates", duplicates: [{ id, igsn, name }] }` unless the request carries `?confirmDuplicates=true`; see [`docs/igsn-core-mapping.md`](../igsn-core-mapping.md#suspected-duplicates).

### 2026-09-25, `GET /service/samples` and `GET /service/samples/:igsn` need no key

- Reading no longer needs a key: a call with no `Authorization` header lists or reads the published samples anyone can already see on the public site, redacted the same way (`redactPrivateContacts`, no archive contact, no `*UserId`).
- A present but unknown key, or a valid key whose owner is no longer accepted, still answers 403.
- An anonymous `?editable=true` is ignored: every published sample is listed, since there is no account to narrow by.
- `POST` and `PUT` are unchanged, still needing a valid key and answering 403 for a missing or unknown one.

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
- A missing header and an unknown key both answer **403** (PO decision): the caller is not a session to renew, and 403 tells a script nothing about whether the key exists. Amended 2026-09-25: this still holds for writing, but a missing header on a read is no longer 403, reading having become public.
- The middleware sets the whole `ServiceAccount` on the context, so a future data route reads its groups (`managerScope` + `moderatedSampleWhere`) with no extra lookup.

## Rejected alternatives

**Keycloak client credentials.** ADR 0035 keeps service accounts out of Keycloak, so a service would need a client, a mapper and a realm role to carry its groups, and the api would still resolve them against its own table. One hashed column reuses the reach it already has.

**Salted password hashing (bcrypt/argon2).** A salt and a work factor defend a low-entropy human secret against a dictionary. A 256-bit random key has no dictionary, so SHA-256 is enough and stays a single indexed lookup per request.

**Several live keys per account.** Rotation without downtime would need a key table. No service asked, and one column plus a rotate button covers the leak case.
