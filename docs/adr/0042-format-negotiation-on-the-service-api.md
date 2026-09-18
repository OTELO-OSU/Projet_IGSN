# 0042. Format negotiation on the `/service` API

Date: 2026-09-17

## Status

Accepted.

## Context

`/service` (ADR [0036](0036-service-account-api-key.md), pivoted to IGSN Core by ADR [0040](0040-igsn-core-pivot-on-service-api.md), published as OpenAPI by ADR [0041](0041-openapi-for-the-service-api.md)) spoke Core alone. `Mapping_implementation_IGSN-Core_v0.10.0_v-Finale.docx` is the signed contract projecting Core onto three standard targets: DataCite 4.7, OGC O&M/OMS and iSamples Core. Integrators that already consume DataCite cannot read Core.

The PO scoped this change to DataCite alone, on the two GET routes only. OMS and iSamples are out of scope, but the shape chosen here must not make them harder to add later.

## Decision

**Map Core to DataCite, not `Sample` to DataCite.** `toDataCiteSample(toCoreSample(sample, frontendUrl))`, in `packages/domain/src/sample/datacite/`. Core is the pivot every adapter maps from; the OMS and iSamples adapters the contract also describes plug in at the same place, each its own folder.

**A vendor-tree media type per adapter.** `application/vnd.otelo.datacite+json` for this change, following RFC 6838 section 3.2 (a format nobody registered, under the producer's own name) and section 4.2.8 (the `+json` structured suffix). The naming carries over to the two adapters still to come: `application/vnd.otelo.oms+json`, `application/vnd.otelo.isamples+json`.

**The media type carries no version.** The record's own `schemaVersion` names the DataCite kernel (`http://datacite.org/schema/kernel-4`), so a future 4.8 mints no second media type; it changes the constant, not the contract's shape.

**`406` over a silent fallback.** An `Accept` we do not serve answers `406`, never a quiet Core response a client mistakes for what it asked.

**The Core `{ data, meta }` envelope is kept for the DataCite list.** `GET /service/samples` under the DataCite media type still answers `{ data: DataCiteSample[], meta: { total } }`, not a bare array, so pagination metadata is not lost to the format switch.

## Rejected alternatives

**Mapping `Sample` straight to DataCite.** Would duplicate the Core mapping's business knowledge (which `Sample` field means what) in a second place, and give the two remaining adapters no shared pivot to plug into.

**A `?format=` query parameter instead of `Accept`.** `Accept` is the HTTP-native way to ask for a representation of the same resource, and Hono ships a matcher (`hono/accepts`) for it; a query parameter would duplicate that negotiation and leave content negotiation, caching, and the OpenAPI content map to hand-roll.

**Falling back to Core on an unknown `Accept`.** Silently answering a format the caller did not ask for is worse than a loud `406`; an integrator misspelling the media type deserves to notice immediately.

## Consequences

- Adding a `/service` route or a new served format still means declaring it in `service-route-definitions.ts` (ADR 0041), now through the `negotiated()` helper listing both media types under one `200`.
- The compiler cannot bind a response body to its media type under `@hono/zod-openapi`: both declared media types infer as `"json"`, so the handler's return type is a union. The header assertions in `service-routes.spec.ts` are the only guard against emitting Core under the DataCite type or vice versa.
- A served media type outranks a wildcard of the same `q` (RFC 9110 section 12.5.1), but two served media types of the same `q` fall to header order, so `Accept: application/json, application/vnd.otelo.datacite+json` serves Core.
- `Accept: application/json;q=0` is not honoured as "explicitly unacceptable" (`ponytail:` in `service-routes.ts`); revisit with a full RFC 9110 parser only if a caller needs it.
- `docs/datacite-mapping.md` records the implemented mapping and its deviations from the contract document.
