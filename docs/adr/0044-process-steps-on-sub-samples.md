# 0044. Process steps on sub-samples

Date: 2026-09-17

## Status

Accepted.

## Context

A sub-sample records only its parent(s), never how it was produced from them: whether it was sawn, powdered, or set aside for preservation. A researcher documenting a thin section wants to say a block was cut, then polished, each step dated and described.

IGSN Core's `production.processSteps` already exists for this, but our pivot (ADR 0040) used it for exactly one purpose: the synthesis step of a synthetic sample, enforced as `z.literal("Synthesis")` and `.length(1)`.

## Decision

**A sub-sample carries a repeatable `processSteps[]`** (`{ kind, date, description }`), edited in the admin form's Identity tab, shown on the public page, and persisted in a new `sample_process_step` child table.

- `kind` is one of `subsampling | derivation | preparation | transformation | preservation | other`. `Collection` and `Synthesis`, Core's own two, are deliberately absent: a collection is already `description.collectionDate`/`collectionMethod`, and a synthesis is already `syntheticDetails`. Recording either again as a process step would give the same fact two homes.
- `kind` is required to save. `date` is required to PUBLISH (`process_step_date_missing`), never to save, so a half-filled draft still saves. `description` stays optional.
- Steps stay editable after publication (no `published-field-lock.ts` entry), like relations: a preservation or preparation step often happens after the IGSN is minted.
- The sub-sample-only rule (`replace-sample-process-steps.ts`) lives in the api, not in `createSampleSchema`/`updateSampleSchema`, because `updateSampleSchema` omits `parentIds` and so cannot tell "no parents" from "unknown parents" at the schema level. The api checks the stored `sample_parent` rows instead.
- One schema for read and write (`sampleProcessStepSchema`): a step carries no id, unlike `relation/model.ts`'s read/write pair, since a step is replaced wholesale rather than addressed individually.

**The `/service` Core contract changes.** `production.processSteps[].stepType` was `z.literal("Synthesis")` with `.length(1)`; it becomes a union of `"Synthesis"` and our six kinds (PascalCase), with `.min(1)` and no upper bound. A `POST`/`PUT` naming a process step on a sample with no parent relation answers 422 `processSteps` / "Process steps require a parent sample", mirroring `parent_not_found`.

**Step order: the synthesis step first, then the stored `processSteps` in process order.** `toCoreProcessSteps` (`domain/sample/core/to-core-production.ts`) still emits the synthesis step, when present, at index 0, exactly where `core-path.ts`'s existing `production.processSteps.0.*` entries (added by ADR 0041) already point.

Process order is `kind` in `PROCESS_STEP_KINDS` declaration order, then `date.start` and `date.end` newest first, then `description`.

- Missing values sort last in their group, which on a published sample only ever applies to `description`.
- One comparator in `domain` states it (`process-step/compare-process-steps.ts`), applied on read in `to-sample.ts` and reused by the admin to place a newly added step.
- It is derived on read, never stored, so no position column exists and an existing row needs no backfill.
- The admin places an added step by kind but never re-sorts live, so a row cannot jump away while it is being filled in.

- ponytail: this makes `production.processSteps.<i>` off by one for a sample carrying both a synthesis step and its own process steps, since a stored step's error path names index `i` while Core sees it at `i + 1`. That shape is reachable by design, not hypothetical: two parents force a synthetic material (ADR 0039), which is exactly what permits `syntheticDetails`, so a combined sample later subsampled carries both. It misnames an index in a 422 body alone, never stored or emitted data. Fix by threading the sample into `toCorePath` if a client hits it.

### Rejected

- **Adding `Collection` and `Synthesis` to the six kinds and letting a client write either through `processSteps`.** Would give collection and synthesis two ways to be recorded and read, one of which (`processSteps`) bypasses `description.collectionDate`/`syntheticDetails` entirely and could disagree with them. `Synthesis` stays ACCEPTED on read (a step of that `stepType` is filtered out of `fromCoreProcessSteps` and read by `fromCoreSyntheticDetails` instead) and is still WRITTEN only from `syntheticDetails`, never from a `processSteps` entry.
- **Numbering the synthesis step by its own index rather than always first.** Core gives no ordering guarantee to lean on either way; fixing it at index 0 keeps ADR 0041's existing path mapping correct, at the cost above.
- **A domain-level parent check reusing the create-time refinement.** `createSampleSchema`'s two-parent cap and similar rules run at creation with `parentIds` in hand; `updateSampleSchema` never carries `parentIds`, so the same refinement cannot express "no parent" there. The check needs the stored relation, so it stays in the api.

## Consequences

- An existing `/service` client reading `production.processSteps` for the synthesis step must now check `stepType === "Synthesis"` rather than assume index 0 is it; index 0 is only guaranteed to be the synthesis step when one exists.
- A `/service` client writing a sub-sample now sends its process steps as ordinary `processSteps[]` entries, `stepType` one of the six PascalCase kinds; the parent relation (`IsDerivedFrom`) must already be present or the write is refused.
- Every step needs a `timestampStart` to publish, so `POST /service/samples`, which creates and publishes in one call, answers 422 `production.processSteps` for an undated step.
- A write round-trips re-ordered: the response lists the steps in process order even when the request listed them otherwise.
- `docs/igsn-core-mapping.md`'s Production section documents both the synthesis-step rows (unchanged) and the new `processSteps.*` rows, and its deviation register.
