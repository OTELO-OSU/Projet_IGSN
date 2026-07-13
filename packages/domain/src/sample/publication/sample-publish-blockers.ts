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
  "elevation_unit_datum_missing",
  "elevation_range_incomplete",
  "numeric_age_unit_missing",
  "numeric_age_reference_missing",
  "numeric_age_range_incomplete",
  "geological_age_range_incomplete",
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

// The three numeric age bounds, each with its own `<bound>Unit`/`<bound>YearsUnit`.
const NUMERIC_BOUNDS = [
  "numericAge",
  "numericAgeMin",
  "numericAgeMax",
] as const;

// A bound with a value must state its unit before publish.
function boundNeedsUnit(
  age: NonNullable<Sample["age"]>,
  bound: (typeof NUMERIC_BOUNDS)[number],
): boolean {
  return age[bound] != null && age[`${bound}Unit`] === null;
}

// A bound stated in annum ("a") is a calendar point and needs its reference set.
function annumNeedsReference(
  age: NonNullable<Sample["age"]>,
  bound: (typeof NUMERIC_BOUNDS)[number],
): boolean {
  return age[`${bound}Unit`] === "a" && age[`${bound}YearsUnit`] === null;
}

// Single source of truth for publishability: an empty result means publishable.
// Type and material are independent dimensions, so both are reported; within
// each only the first blocker (a value must be set before it is worth refining).
// A value outside the vocabulary is treated as incomplete, never as publishable:
// the type is only nominally validated (`SampleType`/`MaterialPath` are `string`),
// so a malformed value must gate publication rather than slip through.
export function samplePublishBlockers(
  sample: Pick<
    Sample,
    "type" | "material" | "metamorphicFacies" | "location" | "age"
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

  // An elevation is optional, but a recorded one must be complete before publish
  // (a draft may leave it half-filled, like age; ADR 0014): both bounds set, and
  // a shared unit and datum. The schema already guarantees min <= max and whole
  // numbers; here we gate the missing pieces.
  const elevation = sample.location?.position?.elevation;
  if (elevation != null) {
    if (elevation.unit == null || elevation.datum == null) {
      blockers.push("elevation_unit_datum_missing");
    }
    if ((elevation.min == null) !== (elevation.max == null)) {
      blockers.push("elevation_range_incomplete");
    }
  }

  // Age is optional, but a recorded numeric value must state its unit before the
  // sample is published (a draft may omit it). Stratigraphic ages carry no unit.
  const age = sample.age;
  if (
    age != null &&
    NUMERIC_BOUNDS.some((bound) => boundNeedsUnit(age, bound))
  ) {
    blockers.push("numeric_age_unit_missing");
  }

  // An age in annum is a point on a calendar, so it needs a reference (CE/BCE/
  // BP/cal BP) before publishing; other units are magnitudes and carry none. A
  // draft may still omit it, so this gates publication rather than the schema.
  if (
    age != null &&
    NUMERIC_BOUNDS.some((bound) => annumNeedsReference(age, bound))
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

  return blockers;
}
