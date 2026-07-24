import { z } from "zod";

import type { Sample } from "../sample.ts";

import { locationRequirement } from "../location/location-requirement.ts";
import { MATERIAL_PATHS } from "../material/classification.ts";
import { isMaterialComplete } from "../material/is-complete.ts";
import { faciesFor } from "../metamorphic-facies/vocabulary.ts";
import { isSampleTypeComplete } from "../type/is-complete.ts";
import { SAMPLE_TYPES } from "../type/vocabulary.ts";

// Reasons a sample cannot be published yet, as codes. Callers map this enum
// exhaustively (e.g. the admin publish tooltip), so a new code fails to compile
// until it is handled and translated.
export const publishBlockerSchema = z.enum([
  "type_missing",
  "type_incomplete",
  "material_missing",
  "material_incomplete",
  "metamorphic_facies_missing",
  "location_position_missing",
  "collection_date_missing",
  "numeric_age_unit_missing",
  "numeric_age_reference_missing",
  "numeric_age_range_incomplete",
  "geological_age_range_incomplete",
  "elevation_incomplete",
  "availability_missing",
  "scientific_context_missing",
  "funder_organization_missing",
  "research_program_name_missing",
  "research_program_chief_missing",
  "research_structure_missing",
  "collector_name_missing",
  "collection_curator_missing",
  "collection_origin_missing",
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

// Single source of truth for publishability: an empty result means publishable.
// Type and material are independent dimensions, so both are reported; within
// each only the first blocker (a value must be set before it is worth refining).
// A value outside the vocabulary is treated as incomplete, never as publishable:
// the type is only nominally validated (`SampleType`/`MaterialPath` are `string`),
// so a malformed value must gate publication rather than slip through.
export function samplePublishBlockers(
  sample: Pick<
    Sample,
    | "type"
    | "material"
    | "metamorphicFacies"
    | "location"
    | "description"
    | "age"
    | "availability"
    | "scientificContext"
  >,
): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];

  if (sample.type === null) {
    blockers.push("type_missing");
  } else if (
    !SAMPLE_TYPES.includes(sample.type) ||
    !isSampleTypeComplete(sample.type)
  ) {
    blockers.push("type_incomplete");
  }

  const materialComplete =
    sample.material !== null &&
    MATERIAL_PATHS.includes(sample.material) &&
    isMaterialComplete(sample.material);
  if (sample.material === null) {
    blockers.push("material_missing");
  } else if (!materialComplete) {
    blockers.push("material_incomplete");
  }

  // A metamorphic sample must declare its facies (a separate required field). A
  // null or out-of-vocabulary value blocks: metamorphicFacies is only nominally
  // validated here, so a malformed value must gate publication, not slip through.
  const facies = faciesFor(sample.material);
  if (
    facies.length > 0 &&
    (sample.metamorphicFacies === null ||
      !facies.includes(sample.metamorphicFacies))
  ) {
    blockers.push("metamorphic_facies_missing");
  }

  // A location (a point or area position) is required to publish unless the
  // material forbids it (synthetic) or exempts it (returned samples). Evaluated
  // only once the material is a complete path, so an incomplete material (which
  // already blocks) does not also raise this (ADR 0014).
  if (
    materialComplete &&
    locationRequirement(sample.material) === "required" &&
    !sample.location?.position
  ) {
    blockers.push("location_position_missing");
  }

  // The collection date (a range; a single date is start === end) is required
  // to publish, like material/type it stays optional on a draft (ADR 0015).
  if (sample.description?.collectionDate == null) {
    blockers.push("collection_date_missing");
  }

  // Age is optional, but a recorded numeric value must state its (shared) unit
  // before the sample is published (a draft may omit it). Stratigraphic ages
  // carry no unit.
  const age = sample.age;
  const hasNumericValue =
    age != null && (age.numericAgeMin != null || age.numericAgeMax != null);
  if (hasNumericValue && age.numericAgeUnit === null) {
    blockers.push("numeric_age_unit_missing");
  }

  // An age in annum is a point on a calendar, so it needs a reference (CE/BCE/
  // BP/cal BP) before publishing; other units are magnitudes and carry none. A
  // draft may still omit it, so this gates publication rather than the schema.
  if (
    hasNumericValue &&
    age.numericAgeUnit === "a" &&
    age.numericAgeYearsUnit === null
  ) {
    blockers.push("numeric_age_reference_missing");
  }

  // A half-entered range (one bound only) is a valid draft but cannot publish:
  // a range needs both bounds. Checked here rather than in ageSchema so editing
  // and saving a draft mid-range is not blocked (matches the unit rule above).
  if (age != null) {
    if ((age.numericAgeMin != null) !== (age.numericAgeMax != null)) {
      blockers.push("numeric_age_range_incomplete");
    }
    if ((age.geologicalAgeMin != null) !== (age.geologicalAgeMax != null)) {
      blockers.push("geological_age_range_incomplete");
    }
  }

  // Elevation is optional, but once any part is recorded it must be complete to
  // publish (both bounds, a unit and a datum), like the age ranges above. A
  // draft may hold a partial elevation; this gates publication, not the schema
  // (ADR 0014).
  const elevation = sample.location?.position?.elevation;
  if (
    elevation != null &&
    (elevation.min == null ||
      elevation.max == null ||
      elevation.unit == null ||
      elevation.datum == null)
  ) {
    blockers.push("elevation_incomplete");
  }

  // Availability (exists / no longer exists) is optional on a draft but must be
  // declared before publishing, so a reader always knows if the sample survives.
  if (sample.availability == null) {
    blockers.push("availability_missing");
  }

  // Scientific context: a published sample must declare its provenance status,
  // then the mandatory fields of the branch that status selects. Optional on a
  // draft. The schema forbids an empty researchStructure array, so null checks
  // cover "not filled" for the multi-select too.
  const context = sample.scientificContext;
  if (context == null) {
    blockers.push("scientific_context_missing");
  } else if (context.provenanceStatus === "recent_collection") {
    if (context.funderOrganization == null)
      blockers.push("funder_organization_missing");
    if (context.researchProgramName == null)
      blockers.push("research_program_name_missing");
    if (context.researchProgramChief == null)
      blockers.push("research_program_chief_missing");
    if (context.researchStructure == null)
      blockers.push("research_structure_missing");
    if (context.collectorName == null) blockers.push("collector_name_missing");
  } else {
    if (context.collectionCurator == null)
      blockers.push("collection_curator_missing");
    if (context.collectionOrigin == null)
      blockers.push("collection_origin_missing");
  }

  return blockers;
}
