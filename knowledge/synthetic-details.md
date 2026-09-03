---
type: domain-model
title: Synthetic sample details
description: >-
  syntheticDetails is the sub-block a synthetic sample carries instead of a
  location, gated by isSyntheticMaterial and required in seven fields to
  publish.
resource: packages/domain/src/sample/synthetic-details
tags:
  - domain
  - sample
  - publication
  - forms
relations:
  - type: depends_on
    target: sample-model
  - type: depends_on
    target: location-material-gate
  - type: depends_on
    target: publish-blockers
  - type: depends_on
    target: published-field-locks
status: stable
---

`syntheticDetails` describes how a synthesized sample was made, the one sub-block a natural sample never carries.

- `isSyntheticMaterial(material)` (`domain/sample/synthetic-details/is-synthetic-material.ts`) is the single predicate for "this sample is synthetic", true at or under `synthetic_rock_mineral`.
- Its five consumers: the `createSampleSchema` refinement rejecting the block on a non-synthetic material, `samplePublishBlockers`, `allowsLocation` ([[location-material-gate]]), the admin Synthetic details tab visibility, and `composeSyntheticDetails` dropping the block on save.
- A synthetic material refuses a location, so the Synthetic details tab replaces the Location tab rather than sitting next to it.
- Every field is nullish, so a half-filled draft saves; seven are required to publish.
- Publish blockers, all gated on a complete synthetic material: `synthetic_starting_material_missing`, `synthetic_starting_material_nature_missing`, `synthetic_starting_material_composition_missing`, `synthetic_final_product_missing`, `synthetic_experiment_duration_missing`, `synthetic_synthesis_date_missing`, `synthetic_operator_name_missing`.
- The composition is required only for a `synthetic` or `mixture` starting material, one shared predicate `needsStartingMaterialComposition` driving the blocker, the admin render gate and the compose exclusion.
- The duration blocker lifts when `experimentDurationNotRelevant` is true, an instant experiment being legitimate.
- Its vocabularies are flat Zod enums in `domain/sample/synthetic-details/`, not `TreeNode` hierarchies ([[vocabulary-tree]]): `startingMaterial`, `startingMaterialNature`, `finalProduct`, `experimentType`, `experimentDurationUnit`.
- Naming trap: `startingMaterial` is where the matter came from (natural, synthetic, mixture) and `startingMaterialNature` its physical form (glass, powder, rock, mineral, fluid).
- `temperature` accepts negative values, `measurementSchema(temperatureUnitSchema, z.number())` overriding the positive default; `pressure` reuses the condition units, which gained `pa` and `gpa` for synthesis pressures.
- `researchStructure` is a multi-ROR array reusing `uniqueRorArraySchema`, exported from `scientific-context/model.ts` for it.
- Persistence is 20 flat `syn_*` columns on `sample` ([[sample-model]]), `syn_research_structure` a `text[]`, written by `syntheticDetailsColumns` and read back by `toSyntheticDetails`.
- Publication freezes every field but the last five: `temperature`, `pressure`, `experimentalProtocol`, `experimentPurpose` and `equipmentUsed` stay editable ([[published-field-locks]]).
- It is absent from the withdrawn whitelist, so a withdrawn sample exposes no synthesis details, and it carries no search facet.
- Two admin controls were generalized for it, both keyed by a field-name prefix: `DateRangeField` (the single-or-range date switch, replacing `collection-dates-field.tsx`) and `MeasurementFieldPair` (a value plus its conditional unit).
- `dateRangeSchema(codePrefix)` (`domain/sample/date-range.ts`) is the shared start/end schema behind `collectionDate` and `synthesisDate`, issuing `<prefix>_order` and `<prefix>_future` issue codes that `sample-draft-field-errors.ts` maps back to flat draft field names by regex over both prefixes.
- The public view renders its section only when the block exists, reusing `OrcidLink`, `OrgLinksRow` and `dateRangeText`, lifted out of the scientific context and description views for it.
