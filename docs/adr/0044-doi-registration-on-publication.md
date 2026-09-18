# 0044. DOI registration at DataCite on publication

Date: 2026-09-18

## Status

Accepted.

## Context

`publishSample` mints the IGSN locally (`generateIgsnSuffix`), unchanged by this ticket. DataCite knew nothing about that IGSN, and the `/service` DataCite record put the bare IGSN in `doi`.

Config: `DATACITE_API_HOST` / `DATACITE_API_KEY` / `DATACITE_DOI_PREFIX`. Auth is the API key sent as `Authorization: Bearer` (DataCite's `bearerAuth`).

## Decision

The DOI is `<prefix>/<igsn>`, the bare name as the DataCite API carries it, never a `doi.org` URL.

- The row snapshots the prefix at publication (`doi_prefix`, write-once via `coalesce`), because the prefix can change over time; the DOI itself is never stored.
- A sample with no snapshotted prefix has no DOI: pre-existing rows and unconfigured stacks keep emitting the bare IGSN, nothing is backfilled.
- Registration happens in `publishSample`, the one function minting an IGSN, so it covers the admin publish for both statuses and `POST /service/samples`.
- `PUT /dois/{doi}` (idempotent), `event: publish` for `published`, `event: register` for `withdrawn`.
- The call runs inside the publish transaction with a 10s timeout; a refused or failed registration throws a 502 `HTTPException`, so nothing is published without a registered DOI.
- `DATACITE_API_HOST` unset disables registration silently. dev and e2e run a Caddy mock (`datacite-mock/Caddyfile`); preprod points at the real API.
- Core gains an emit-only `identification.doi`; the DataCite `doi` falls back to `sampleIdentifier` when absent.

See ADR [0032](0032-sample-withdrawal-status.md) (withdrawal), ADR [0036](0036-service-account-api-key.md) (service mount), ADR [0040](0040-igsn-core-pivot-on-service-api.md) (Core pivot), ADR [0042](0042-format-negotiation-on-the-service-api.md) (format negotiation).

## Rejected

- **Storing the full DOI.** Redundant with `igsn` + prefix, and no backfill wanted.
- **Registering outside the transaction, or asynchronously.** Leaves a published sample with no DOI and nothing retrying it.
- **Registering only from the admin publish button.** A computed DOI would then be advertised for withdrawn or service-created samples DataCite never saw.
- **Computing the DOI from the current env prefix, unsnapshotted.** A prefix change would rewrite every historic DOI.
- **Fetching the prefix from `/client-prefixes`.** An extra call and failure mode for a constant.

## Consequences

- The row lock and a pool connection are held for the round trip, capped by the timeout and the per-user rate limit; a `ponytail:` comment marks this tradeoff.
- A commit failing after a successful PUT leaves a registered DOI that the next publish re-PUTs.
- A withdrawn sample's full Core record reaches DataCite under `register`, while the registry's own public payload is the `toWithdrawnSample` whitelist (ADR 0032); a policy point to revisit.
- `PUT /admin/samples/:id/status` and later metadata edits are not synced to DataCite (out of scope, follow-up).
- `doiPrefix` rides on public sample payloads, a public identifier component.
- No UI shows the DOI yet.
