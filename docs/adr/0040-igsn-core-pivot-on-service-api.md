# 0040. IGSN Core pivot on the `/service` API

Date: 2026-09-14

## Status

Accepted. Amends ADR 0036: `GET/POST/PUT /service/samples` and `GET /service/samples/:igsn` now emit and accept IGSN Sample Core v0.10.0 records instead of our internal `Sample` shape.

## Context

`docs/igsn-core-mapping.md` was a v0.7.0 study recording why the IGSN Sample Core pivot could not ship: no slot for provenance status, collection origin, synthesis parameters, age, hazards, collection-date precision, programme description, and a status model foreign to ours. IGSN Core v0.10.0 answers every one of those gaps (`extensions.geology / safety / experiment`, `lifecycleEvents`, `production.collectionMethod`, date precision and time zone, `Project.funding`/`description`).

The PO scoped the pivot: mapping only, no admin or frontend behaviour change, no vocabulary or label change. Legacy-imported rows are explicitly out of scope, the import being unfinished and no data imported yet.

## Decision

**The pivot maps in both directions**, `GET` emitting `{ data: CoreSample[], meta }` and `POST`/`PUT` accepting a Core body and answering the stored sample as a Core record.

**One mapping place**, `packages/domain/src/sample/core/`: `toCoreSample` / `fromCoreSample` are the single conversion, `coreSampleSchema` (emitted, tight) and `coreSampleBodySchema` (accepted) the single schemas. No second mapper in `api` or in either app; `domain` has no I/O, so `frontendUrl` is passed in rather than read from an env var inside the mapper.

**Strict schema.** Every Core object is a `strictObject`; an unmodelled field is refused (`unrecognized_keys`), not silently dropped, so a client learns immediately that a field carries no meaning here.

**Two-stage validation.** `fromCoreSample` only reshapes a body; the route then runs `createSampleSchema` / `updateSampleSchema`, so every domain refinement (branch rules, existence/availability compatibility, texture-by-material) stays single-sourced in `domain/sample` rather than duplicated in the Core schema. `core-path.ts` (`toCorePath`) translates every internal error path (blocker paths, `frozenFieldEdits`, stage-2 zod issues) into its Core path before it reaches the caller, layered on top of the untouched `publish-blocker-path.ts`.

**A parent is addressed by IGSN**, via an `IsDerivedFrom` relation on `relations[]`, not by internal id: Core has no concept of our uuid. The route resolves it with `findEligibleParentByIgsn` (published samples only) before running `createSampleSchema`; an unresolved parent is `parent_not_found` at `relations.<i>.targetIdentifier.value`, and a changed parent on `PUT` is 403 `field_frozen` at `relations.<i>`.

**`Sample.publishedAt`** (nullable, coerced date) is a new field the `published` lifecycle event needs; `sample.published_at` is set once on first publish (`coalesce(published_at, now())`) and backfilled from `updated_at` for existing non-draft rows.

## Rejected alternatives

**A loose Core validator accepting any shape Core allows.** Would let an unknown vocabulary value or an out-of-scheme concept id through; `coreSampleSchema` instead keys every `Concept` on `schemeName` and validates its `id` against the matching domain schema (`materialPathSchema`, `natureSchema`, etc.), so an unknown value is a parse error, not a silently accepted string.

**A blocker-only path map.** `PUBLISH_BLOCKER_PATH` alone covers publish blockers but not `frozenFieldEdits` results or stage-2 zod issues; a single `toCorePath` covering all three keeps one map instead of three call sites each guessing their own translation.

**Mapping inside `api`.** Would put a domain concern (what a `Sample` field means in Core terms) behind the trust boundary, unreachable from a future second caller and violating the package layering rule that a shared function lives in `domain`.

**A tolerant schema for legacy-imported rows.** The PO scoped legacy rows out: the import is unfinished and no legacy data exists yet, so `coreSampleSchema` assumes every row satisfies `samplePublishBlockers` and stays strict.

## Consequences

- `docs/igsn-core-mapping.md` is rewritten as the implemented mapping, replacing the v0.7.0 study; deviations from the Core spec worth raising with its authors are listed there.
- The `/service` 422/403 body shapes are unchanged (`{ error, issues: [{ path?, code, message? }] }`), only `path` now speaks Core paths instead of internal ones.
- `manualGroups` now travels both ways as `manualGroups[]`; `attachments` stays refused in both directions.
- A future second Core-speaking caller reuses `domain/sample/core/` with no duplication.
