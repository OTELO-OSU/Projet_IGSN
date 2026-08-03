# 0021. Post-publish field mutability

Date: 2026-07-29

## Status

Accepted.

## Context

Publishing mints the IGSN and makes a sample citable, but declaration data keeps
improving: a researcher refines an elevation, corrects a security note, adds a
link. We need a rule for what a published sample may still change, enforced
where a crafted request cannot bypass it.

## Decision

**A published sample is partially mutable.** The IGSN identity (name, nature,
type, material) is frozen. Everything else stays editable, including the
material's dependent leaves (`texture`, `metamorphicFacies`).

> Updated by ADR [0022](0022-editable-material-levels-after-publication.md):
> `material` is no longer wholly frozen, only its coarse classification is. It
> has no lock-map entry; `mergeMaterial` and the form resolver derive its frozen
> levels from the stored path.

**The rule lives in lock maps, nowhere else.**
`domain/sample/publication/published-field-lock.ts` opens with one map of locked
fields per merged shape. Each entry is a frozen field: the key is the field name
in the merged shape, the value the admin form's field names for it (several when
the form splits it, a position into six coordinates). `mergePublishedEdit` reads
the keys through `freezeLocked`: listed keys come from the stored sample, all
others from the payload. The admin form reads the values, flattened into
`FROZEN_FORM_FIELDS` and `FROZEN_FORM_FIELDS_BY_PROVENANCE`. Editable is the
default, so freezing a field is one entry, and `keyof` checks make a rename fail
to compile.

Domain naming the form's field names is deliberate: it is the only way a single
entry serves both readers. The alternative, a mapping table in `admin` keyed by
the lock lists' types, was built first and rejected in review: it was a second
place to edit for every lock, which is maintenance burden for the sake of
layering purity.

**Conditional locks stay hand-written**, since a leaf whose lock depends on a
frozen sibling cannot be a list entry: `texture` and `metamorphicFacies` are
taken only from a payload that agrees on the frozen material
(`mergeMaterialDependent`), because `createSampleSchema` refines them against it
and nothing re-validates the merge, so a payload on another material would store
a pair the schema rejects; `position.elevation` is editable inside a frozen
position, `navigationType` only while that position exists, the whole location
drops when the frozen material forbids one (synthetic, ADR 0014), and the
scientific context's frozen discriminant keeps the stored branch whole.

**Enforcement is merge-not-reject.** `PUT /:id` overlays only editable paths onto
the stored sample, so a payload touching a frozen field is silently dropped. That
merge is the mass-assignment guard; disabled form inputs are UX only.

**The API blocks only new blockers**, comparing `samplePublishBlockers` before
and after the merge (409 on a newly introduced one). **The admin form validates
the draft strictly** against `publishedSampleSchema`. The two bars differ on
purpose: the API must not lock an already-broken record (DB tampering, a new
constraint) out of repair by a script, while the form is where a researcher sees
the record no longer meets the bar. A sample broken on a frozen field is
unsavable through the form; repairing it is an admin/API action.

**Frozen inputs are disabled by a form-level resolver, no marker.** No control
decides for itself that publication freezes it. `SampleForm` provides a
`FieldDisabledProvider` (`design-system`) holding
`publishedSampleFrozenField(provenanceStatus, storedMaterial)`
(`admin/src/samples/published-sample-frozen-field.ts`), a predicate on the
field name.
`TextField`, `ComboboxField`, `MultiComboboxField` and `DateField` read it
through `useFieldDisabled(disabled)`, which ORs it with their own
dependent-field reason, so a field waiting on its sibling stays disabled on a
published sample too; `NumberField` forwards its `disabled` to `TextField`,
which resolves it. A control with no field context asks by name instead
(`useIsFieldDisabled()`), which is how the collection-date mode `Switch` follows
the dates it drives. `HierarchySelectField` no longer takes `isSamplePublished`:
its levels register `name[depth]`, which the predicate covers, and its plain
`disabled` is now free for the per-level "waiting on its parent" case.

**Deferred:** `repository.*`, `context.geotectonic`, and `condition.preparation`
/ `state_of_conservation` / `transformation` have no `CreateSample` field yet.
`CheckboxGroupField` has no field-level `disabled` and no locked field uses it,
so it does not read the resolver; the prop comes with the first lock that needs
it.

### Rejected

- **A merge line per field** (`current.x` or `incoming.x`, typed so a new field
  fails to compile): ~22 near-identical lines where the decision hid in which
  object each one read.
- **A `Record<keyof CreateSample, FieldLock>` classification**: a second
  hand-maintained copy no runtime code read and nothing checked. The lock lists
  are not that record, because the merge reads them.
- **Strict re-validation of the merge API-side**: a pre-existing blocker alone
  failed the parse, locking a broken sample out of every edit.
- **409 on any frozen-field change**: a new error path for no security gain, the
  merge already handles echo-backs and attempted changes identically.
- **A `FrozenField` fieldset wrapper**: hid which control was frozen at the call
  site, and would blur into the coming per-level disabling. The resolver is not
  that wrapper: it supplies one prop to a control that still declares itself, its
  label and its own reasons, at its call site.
- **A lock badge per frozen field**: dropped by the designer, since badging half
  the disabled fields made the other half more confusing.

## Consequences

- A new `CreateSample` field is editable until someone lists it, and nothing
  fails to compile to demand the decision. Deliberate trade for a rule a
  developer can read and change in one place.
- The form holds no copy of the rule: `publishedSampleFrozenField`
  (`admin/src/samples/published-sample-frozen-field.ts`) flattens the exported
  form names, strips the hierarchy-level suffix, and resolves the frozen material
  depth (ADR 0022), nothing else. A renamed form field is
  caught only by the `sample-form.spec.tsx` assertions. Being UX, a disagreement
  is a display bug, never a persistence one.
- An already-broken published sample stays editable on its editable fields
  indefinitely through the API, and not at all through the form.
- `mergePublishedEdit` drops an editable leaf to null when its frozen sibling is
  absent (elevation without a position) rather than adopting a meaningless
  value. Nothing re-validates the merge, so validity that depends on a frozen
  field is frozen with it, or, like texture and facies, taken only from a
  payload that agrees on that field.
