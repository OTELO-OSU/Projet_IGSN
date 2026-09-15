# 0036. Service account owner and API key

Date: 2026-09-08

## Status

Accepted. Amended 2026-09-10: `GET /service/ping` is deleted, `GET /service/samples` having become the mount's route and the proof that a key works. Amended again 2026-09-10: that list defaults to every published sample rather than the account's own reach, `?editable=true` narrowing it to `managerScope`, and it emits the two archive contacts unredacted, a product-owner decision taken because the IGSN Core mapping will not expose them. Scoping by default with an `?all=true` to widen was rejected: an external service reads the registry, so the narrow view is the exception. Amended 2026-09-11: `POST /service/samples` creates and publishes a sample in one transaction, owned by the service account's owner and snapshotting the account's own institutional trio, not the owner's, so it shows under `?editable=true`. The service sees no status and no draft, so the admin's publish vocabulary never reaches it: every refused body answers one shape, 422 `{ error: "Invalid sample", issues: [{ path?, code, message? }] }`, listing every problem at once so a script fixes them in one round and a future IGSN Core mapping translates `code` and `path` mechanically. `code` is a zod issue code for a schema failure (with zod's `message`), or a `samplePublishBlockers` code with its field path from `publish-blocker-path.ts`: the route resolves the parent id and passes it in `parents`, a `null` entry firing `parent_not_found` at `parentIds.0` for a non-uuid, unknown, draft or out-of-reach parent alike (one code for all, so the route is no existence oracle). The two remaining service-only codes are this route's own request-shape rules: `location_inherited_from_parent` at `location` since a sub-sample inherits its parent's location as is, and `manual_group_not_attachable` at `manualGroupIds.<i>`. `createServiceSampleSchema` (`domain/service-account/service-sample-validator.ts`) is `createSampleSchema` with `parentIds` widened to any string for that reason; the blockers read the eligible parent's location; no `publisher` argument is needed since `findByApiKeyHash` already requires an accepted owner; manual groups and the parent are checked against the owner as a plain user, never super admin. Amended 2026-09-11: `PUT /service/samples/:igsn` updates a published sample the account's `managerScope` reaches, the same reach as `?editable=true`. 404 for an unknown IGSN or a non-published one (withdrawn included), 403 `{ error: "Forbidden" }` outside that reach. `updateServiceSampleSchema` (`updateSampleSchema` with `attachments` refused) feeds `mergePublishedEdit` through `frozenFieldEdits`; unlike the admin route's merge-not-reject (ADR 0021), a frozen field sent with a different value answers 403 `{ error: "Forbidden", issues: [{ path, code: "field_frozen" }] }`, nothing written, both reading the same lock maps; a frozen field omitted from the body keeps its stored value, since asking a script for a value it cannot change is pointless, and the route persists the merge. A newly introduced publish blocker answers the one 422 `{ error: "Invalid sample", issues }` shape, via `newPublishBlockers`, the diff core now shared with the admin route's own 409 check. No `expectedUpdatedAt` stale check, no human edit lock, no moderation mail, no attachments reconcile. Amended 2026-09-14: `POST /service/samples` accepts up to two parents (ADR [0039](0039-two-parent-sub-samples.md)); the service body carries `createSampleSchema`'s two-parent refinements, `parent_not_found` names the failing index, and location is inherited only when there is exactly one parent. Amended again 2026-09-14: `GET/POST/PUT /service/samples` and `GET /service/samples/:igsn` now emit and accept IGSN Sample Core v0.10.0 records instead of the internal `Sample` shape described above, every path travelling out as its Core path, so a parent is named by its IGSN and `parent_not_found` sits at `relations.<i>.targetIdentifier.value`; see ADR [0040](0040-igsn-core-pivot-on-service-api.md). Amended 2026-09-15: the four routes are declared through `@hono/zod-openapi`, publishing `GET /service/docs` and `GET /service/openapi.json` as two further public routes ahead of the API-key guard; see ADR [0041](0041-openapi-for-the-service-api.md). That declaration answers **415** `{ error: "Unsupported Media Type" }` for a `POST`/`PUT` with a missing or non-JSON `Content-Type`, where the hand-rolled validator used to substitute an empty body and answer 422 `Invalid sample`. This contradicts the "one error shape everywhere" read above; kept because 415 is the correct status, both operations declare it in the published spec, and no integrator exists yet to break.

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
