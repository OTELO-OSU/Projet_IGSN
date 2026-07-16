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
    "type" | "material" | "metamorphicFacies" | "location" | "description"
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

  return blockers;
}
