import { z } from "zod";

import type { Sample } from "../sample.ts";

import { DEFAULT_UPLOAD_LIMIT } from "../attachment/attachment-validator.ts";
import { locationRequirement } from "../location/location-requirement.ts";
import { MATERIAL_PATHS } from "../material/classification.ts";
import { isMaterialComplete } from "../material/is-complete.ts";
import { faciesFor } from "../metamorphic-facies/vocabulary.ts";
import { isSampleTypeComplete } from "../type/is-complete.ts";
import { SAMPLE_TYPES } from "../type/vocabulary.ts";

// Callers map this enum exhaustively (e.g. the admin publish tooltip), so a new
// code fails to compile until it is handled and translated.
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
  "attachment_limit_exceeded",
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

export type PublishableFields = Pick<
  Sample,
  | "type"
  | "material"
  | "metamorphicFacies"
  | "location"
  | "description"
  | "age"
  | "availability"
  | "scientificContext"
>;

// A create payload holds `undefined` for an absent field, a stored sample holds
// `null`, and samplePublishBlockers distinguishes the two (a missing type reads
// as `type_missing`, an unrecognized one as `type_incomplete`).
export function toPublishableFields(
  sample: Partial<PublishableFields>,
): PublishableFields {
  return {
    type: sample.type ?? null,
    material: sample.material ?? null,
    metamorphicFacies: sample.metamorphicFacies ?? null,
    location: sample.location ?? null,
    description: sample.description ?? null,
    age: sample.age ?? null,
    availability: sample.availability ?? null,
    scientificContext: sample.scientificContext ?? null,
  };
}

// A value outside the vocabulary is treated as incomplete, never as publishable:
// the type is only nominally validated (`SampleType`/`MaterialPath` are `string`),
// so a malformed value must gate publication rather than slip through.
export function samplePublishBlockers(
  sample: PublishableFields & {
    // Only the length is read, so the api's saved `Sample["attachments"]` and
    // the admin's post-save count both fit. Omitted means "unknown", never
    // blocking.
    attachments?: { readonly length: number };
  },
  uploadLimit: number = DEFAULT_UPLOAD_LIMIT,
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

  const facies = faciesFor(sample.material);
  if (
    facies.length > 0 &&
    (sample.metamorphicFacies === null ||
      !facies.includes(sample.metamorphicFacies))
  ) {
    blockers.push("metamorphic_facies_missing");
  }

  // Evaluated only once the material is a complete path, so an incomplete
  // material (which already blocks) does not also raise this (ADR 0014).
  if (
    materialComplete &&
    locationRequirement(sample.material) === "required" &&
    !sample.location?.position
  ) {
    blockers.push("location_position_missing");
  }

  if (sample.description?.collectionDate == null) {
    blockers.push("collection_date_missing");
  }

  // Stratigraphic ages carry no unit.
  const age = sample.age;
  const hasNumericValue =
    age != null && (age.numericAgeMin != null || age.numericAgeMax != null);
  if (hasNumericValue && age.numericAgeUnit === null) {
    blockers.push("numeric_age_unit_missing");
  }

  // An age in annum is a point on a calendar, so it needs a reference (CE/BCE/
  // BP/cal BP) before publishing; other units are magnitudes and carry none.
  if (
    hasNumericValue &&
    age.numericAgeUnit === "a" &&
    age.numericAgeYearsUnit === null
  ) {
    blockers.push("numeric_age_reference_missing");
  }

  if (age != null) {
    if ((age.numericAgeMin != null) !== (age.numericAgeMax != null)) {
      blockers.push("numeric_age_range_incomplete");
    }
    if ((age.geologicalAgeMin != null) !== (age.geologicalAgeMax != null)) {
      blockers.push("geological_age_range_incomplete");
    }
  }

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

  if (sample.availability == null) {
    blockers.push("availability_missing");
  }

  // The schema forbids an empty researchStructure array, so null checks cover
  // "not filled" for the multi-select too.
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

  // A sample carrying more attachments than the deployment allows cannot be
  // published until files are removed: no grandfathering for legacy samples.
  if (sample.attachments != null && sample.attachments.length > uploadLimit) {
    blockers.push("attachment_limit_exceeded");
  }

  return blockers;
}
