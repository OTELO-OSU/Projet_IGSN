---
type: domain-model
title: "allowsLocation and requiresLocation: the two location gates"
description: >-
  allowsLocation(material) decides whether a sample may carry a location;
  requiresLocation(provenanceStatus) decides whether publishing needs one. The
  Location tab shows by default and hides only for a refusing material.
resource: packages/domain/src/sample/location/allows-location.ts
tags:
  - domain
  - sample
  - location
  - forms
relations:
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: publish-blockers
  - type: depends_on
    target: scientific-context
status: stable
---

`allowsLocation(material)` (`domain/sample/location/allows-location.ts`) is the single source of truth for whether a sample may carry a location. It is a boolean predicate: a material either allows a location or refuses one, with no `optional` or `undetermined` state.

Three consumers:

- The admin form: the Location tab's visibility. The tab shows by default, for any material including none chosen yet, and hides only for a refusing material.
- `createSampleSchema`: rejects a location the material forbids.
- `samplePublishBlockers`: requires a position where a location applies and is required (`location_position_missing`).

Refusing materials: `synthetic_rock_mineral`, through the shared `isSyntheticMaterial` ([[synthetic-details]]), and `extraterrestrial_rock.returned_samples[.*]`. Everything else allows a location.

Whether publishing needs that location is a second predicate, `requiresLocation(provenanceStatus)` (`domain/sample/location/requires-location.ts`), since 2026-09-04:

- True unless the scientific context is a `collection_specimen` ([[scientific-context]]); an unset provenance still requires a location.
- Read by `samplePublishBlockers` for `location_position_missing` and by the admin Location tab, where one `form.Subscribe` in `LocationFields` toggles the `*` marker on the type combobox and the coordinate fields. Vertical fields keep their own sibling gate.
- A field sample therefore needs a position (point, area or line) to publish; a collection specimen publishes with or without one.

- A synthetic material trades the Location tab for the Synthetic details tab, the two gates reading the same predicate.
- Entering a location then picking a refusing material drops it on save, per the hidden-value rules of [[form-kit-and-hidden-values]].
- On a published sample, the whole location drops when the frozen material forbids one ([[published-field-locks]]).
