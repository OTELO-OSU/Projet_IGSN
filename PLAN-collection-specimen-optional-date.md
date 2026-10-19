# Collection date optional on collection specimens

## Context

- Today every sample needs a collection date to publish (`collection_date_missing`, unconditional).
- Wanted: a sample whose provenance status is `collection_specimen` publishes without one.
- Decided with the user: the date is required only on a **top-level research project sample** (or one with no provenance yet), exactly like the location rule; a sub-sample keeps copying whatever date its parents have, possibly none.
- Ripple: Core (`/service`), DataCite sync and the OMS export all call `collectionDateSchema.parse` / read required Core fields, so a dateless published sample would crash `toCoreSample` (and therefore publish, sync and `/service` reads). Those must accept a missing date.

## Changes

1. **Rule** `packages/domain/src/sample/publication/sample-publish-blockers.ts:187`
   - Push `collection_date_missing` only when `!hasParent && sample.scientificContext?.provenanceStatus !== "collection_specimen"` (reuse the `hasParent` already computed above it).
   - Admin `*` marker and tab counter follow automatically (`sampleRequiredFields` derives from `samplePublishRequirements`).
   - `packages/admin/src/samples/sample-required-fields.ts:77`: delete the `isSubSample` special case if it is now redundant (keep it if `isSubSample` differs from `parentIds` non-empty).
   - Import template needs nothing: the column is already conditional ("Leave empty when Parent IGSN is filled"), never starred.

2. **Sub-sample shows its date, disabled** `packages/admin/src/samples/sample-identity-tab.tsx:81`
   - Replace `{parents.length === 0 ? <CollectionDateField /> : null}` with the field always rendered, wrapped on a sub-sample in a nested `<FieldDisabledProvider value={() => true}>` (`@projet-igsn/design-system/components/form/field-disabled-context`).
   - Every control of `DateRangeField` already reads that context (`useIsFieldDisabled` for the mode switch, `useFieldDisabled` for the kit fields), so no new prop.
   - The value shown is the one the form already holds: `to-sub-sample-defaults.ts` (`inheritedCollectionDate`) on creation, the stored date on edit; an empty disabled field when the parents have none.
   - No `*` on it: `sample-required-fields.ts:184` already skips the sub-sample's date fields.
   - `docs/updating-the-sample-form.md:339`: the sub-sample's collection date is now shown disabled, not hidden.

3. **Core contract** `packages/domain/src/sample/core/core-production-schema.ts`
   - `collection_date_start`, `collection_date_end`, `collectionDatePrecision` become `.optional()`; descriptions say "required on a published research project sample without a parent".
   - superRefine: the three are all present or all absent (one issue on the missing ones).
   - `to-core-production.ts`: emit the four fields only when `sample.description?.collectionDate` is set (drop the throwing `.parse`).
   - `from-core-sample.ts:93`: `collectionDate: null` when `collection_date_start` is absent.

4. **DataCite** `packages/domain/src/sample/datacite/to-datacite-dates.ts`: no `Collected` entry when Core has no start.

5. **OMS** `packages/domain/src/sample/oms/oms-schema.ts`: `startTime`, `endTime`, `timePrecision` of `samplingSchema` become `.optional()` (as in `preparationStepSchema`); `to-oms-sampling.ts` already passes `undefined` through.

6. **Docs**
   - `docs/igsn-core-mapping.md:16`: drop "a collection date" from the guaranteed list, note the three fields are optional.
   - Short ADR in `docs/adr/` (next number): Core collection date fields become optional on the public `/service` contract, required only on a top-level research project sample. Amends ADR 0045's "sub-sample of dateless parents" line.

## Tests (TDD, write first)

- `sample-publish-blockers.spec.ts`: a `collection_specimen` with no date has no blocker; a sub-sample with no date has none; a top-level research project sample without date still gets `collection_date_missing` (existing `it.each`).
- `core-production-schema.spec.ts`: accepts no dates; refuses a start without end/precision.
- `to-core-sample.spec.ts` / `core-round-trip.spec.ts`: a dateless sample maps to Core without the fields and back to `collectionDate: null`.
- `to-datacite-dates` spec: no `Collected` date when absent.
- `sample-form.spec.tsx:3394` ("should offer the collection date on a root sample only"): rewrite as the group always shown, its date inputs enabled on a root sample and disabled on a sub-sample, showing the parent's date.
- `sample-required-fields` spec (admin): collection date not starred once provenance is collection specimen.
- api: one `/service` POST of a dateless `collection_specimen` publishing 201 (existing service-write spec), proving `toCoreSample` and `syncDoi` no longer throw.

## Verification

- `pnpm test --project @projet-igsn/domain`, `--project @projet-igsn/api`, `--project @projet-igsn/admin`.
- `pnpm lint:check`, `pnpm fmt:check`.
- `make test-e2e` once at the end, then delete this plan from the repo root (`git rm`) in the last commit (memory: e2e `fillPublishableFields` and seed-demo rows are unaffected since nothing becomes stricter).
