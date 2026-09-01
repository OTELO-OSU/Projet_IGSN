# 0021. Post-publish field mutability

Date: 2026-07-29

## Status

Accepted. ADR 0022 unfroze the deeper material levels: `material` has no lock-map entry, its frozen levels being derived from the stored path. A super admin (`canEditFrozenSampleFields`, `domain/user/can-edit-frozen-sample-fields.ts`) bypasses every lock in this document except the IGSN, which stays out of `createSampleSchema` entirely.

## Context

Publishing mints the IGSN and makes a sample citable, but declaration data keeps improving: a researcher refines an elevation, corrects a security note, adds a link. We need a rule for what a published sample may still change, enforced where a crafted request cannot bypass it.

## Decision

**A published sample is partially mutable.** The IGSN identity (name, nature, type, and the coarse material classification) is frozen. Everything else stays editable, including the material's dependent leaves (`texture`, `metamorphicFacies`).

**The rule lives in lock maps, nowhere else.** `domain/sample/publication/published-field-lock.ts` opens with one map of locked fields per merged shape. Each entry is a frozen field: the key is the field name in the merged shape, the value the admin form's field names for it, several when the form splits it, as a position into six coordinates. `mergePublishedEdit` reads the keys through `freezeLocked`, so listed keys come from the stored sample and all others from the payload, while the admin form reads the values, flattened into `FROZEN_FORM_FIELDS` and `FROZEN_FORM_FIELDS_BY_PROVENANCE`. Editable is the default, so freezing a field is one entry, and `keyof` checks make a rename fail to compile.

Domain naming the form's field names is deliberate: it is the only way one entry serves both readers. The alternative, a mapping table in `admin` keyed by the lock lists' types, was built first and rejected in review as a second place to edit for every lock, maintenance burden for the sake of layering purity.

**Conditional locks stay hand-written**, a leaf whose lock depends on a frozen sibling not being expressible as a list entry: `texture` and `metamorphicFacies` are taken only from a payload that agrees on the frozen material, because `createSampleSchema` refines them against it and nothing re-validates the merge; `position.vertical` is editable inside a frozen position; `navigationType` only while that position exists; the whole location drops when the frozen material forbids one (ADR 0014, ADR 0016); and the scientific context's frozen discriminant keeps the stored branch whole.

**Enforcement is merge-not-reject.** `PUT /:id` overlays only editable paths onto the stored sample, so a payload touching a frozen field is silently dropped. That merge is the mass-assignment guard, and disabled form inputs are UX only.

**The API blocks only new blockers**, comparing `samplePublishBlockers` before and after the merge and answering 409 on a newly introduced one, while **the admin form validates the draft strictly** against `publishedSampleSchema`. The two bars differ on purpose: the API must not lock an already-broken record (DB tampering, a new constraint) out of repair by a script, while the form is where a researcher sees the record no longer meets the bar.

**Frozen inputs are disabled by a form-level resolver, with no marker.** No control decides for itself that publication freezes it: `SampleForm` provides a `FieldDisabledProvider` holding `publishedSampleFrozenField(provenanceStatus, storedMaterial)`, a predicate on the field name, and the kit's field controls read it through `useFieldDisabled(disabled)`, which ORs it with their own dependent-field reason. A control with no field context asks by name instead (`useIsFieldDisabled()`), which is how the collection-date mode switch follows the dates it drives.

**Deferred**: `repository.*`, `context.geotectonic` and `condition.preparation` / `state_of_conservation` / `transformation` have no `CreateSample` field yet. `CheckboxGroupField` has no field-level `disabled` and no locked field uses it, so the prop comes with the first lock that needs it.

### Rejected

- **A merge line per field** (`current.x` or `incoming.x`, typed so a new field fails to compile): ~22 near-identical lines where the decision hid in which object each one read.
- **A `Record<keyof CreateSample, FieldLock>` classification**: a second hand-maintained copy no runtime code read and nothing checked. The lock lists are not that record, because the merge reads them.
- **Strict re-validation of the merge API-side**: a pre-existing blocker alone failed the parse, locking a broken sample out of every edit.

## Consequences

- A new `CreateSample` field is editable until someone lists it, and nothing fails to compile to demand the decision. A deliberate trade for a rule a developer can read and change in one place.
- The form holds no copy of the rule: `publishedSampleFrozenField` (`admin/src/samples/published-sample-frozen-field.ts`) flattens the exported form names, strips the hierarchy-level suffix and resolves the frozen material depth (ADR 0022), nothing else. A renamed form field is caught only by the `sample-form.spec.tsx` assertions, and being UX, a disagreement is a display bug, never a persistence one.
- An already-broken published sample stays editable on its editable fields indefinitely through the API, and not at all through the form.
- `mergePublishedEdit` drops an editable leaf to null when its frozen sibling is absent (a vertical position without a position) rather than adopting a meaningless value. Nothing re-validates the merge, so validity that depends on a frozen field is frozen with it.
