import { z } from "zod";

import type { Sample } from "../sample.ts";

import { MATERIAL_PATHS } from "../material/classification.ts";
import { isMaterialComplete } from "../material/is-complete.ts";
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
]);

export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

// Single source of truth for publishability: an empty result means publishable.
// Type and material are independent dimensions, so both are reported; within
// each only the first blocker (a value must be set before it is worth refining).
// A value outside the vocabulary is treated as incomplete, never as publishable:
// the type is only nominally validated (`SampleType`/`MaterialPath` are `string`),
// so a malformed value must gate publication rather than slip through.
export function samplePublishBlockers(
  sample: Pick<Sample, "type" | "material">,
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

  if (sample.material === null) {
    blockers.push("material_missing");
  } else if (
    !MATERIAL_PATHS.includes(sample.material) ||
    !isMaterialComplete(sample.material)
  ) {
    blockers.push("material_incomplete");
  }

  return blockers;
}
