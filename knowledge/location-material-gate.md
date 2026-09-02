---
type: domain-model
title: "allowsLocation: the material-driven location gate"
description: >-
  One predicate decides whether a material allows a location; the Location tab
  shows by default and hides only for a refusing material.
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
status: stable
---

`allowsLocation(material)` (`domain/sample/location/allows-location.ts`) is the single source of truth for whether a sample may carry a location. It is a boolean predicate: a material either allows a location or refuses one, with no `optional` or `undetermined` state.

Three consumers:

- The admin form: the Location tab's visibility. The tab shows by default, for any material including none chosen yet, and hides only for a refusing material.
- `createSampleSchema`: rejects a location the material forbids.
- `samplePublishBlockers`: requires a position where a location applies (`location_position_missing`).

Refusing materials: `synthetic_rock_mineral` and `extraterrestrial_rock.returned_samples[.*]`. Everything else allows a location and requires a position (point, area or line) to publish.

- Entering a location then picking a refusing material drops it on save, per the hidden-value rules of [[form-kit-and-hidden-values]].
- On a published sample, the whole location drops when the frozen material forbids one ([[published-field-locks]]).
