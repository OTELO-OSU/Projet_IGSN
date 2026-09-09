import type { z } from "zod";

import { createSampleSchema } from "../sample.ts";
import {
  type PublishBlocker,
  samplePublishBlockers,
  toPublishableFields,
} from "./sample-publish-blockers.ts";

const BLOCKER_PATHS: Record<PublishBlocker, PropertyKey[]> = {
  nature_missing: ["nature"],
  type_missing: ["type"],
  type_incomplete: ["type"],
  material_missing: ["material"],
  material_incomplete: ["material"],
  location_position_missing: ["location"],
  collection_date_missing: ["description", "collectionDate"],
  numeric_age_unit_missing: ["age", "numericAgeUnit"],
  numeric_age_reference_missing: ["age", "numericAgeYearsUnit"],
  numeric_age_range_incomplete: ["age"],
  geological_age_range_incomplete: ["age"],
  vertical_position_incomplete: [
    "location",
    "position",
    "vertical",
    "reference",
  ],
  existence_status_missing: ["existenceStatus"],
  availability_status_missing: ["availabilityStatus"],
  scientific_context_missing: ["scientificContext", "provenanceStatus"],
  collector_name_missing: ["scientificContext", "collectorName"],
  collection_curator_missing: ["scientificContext", "collectionCurator"],
  collection_origin_missing: ["scientificContext", "collectionOrigin"],
  synthetic_starting_material_missing: ["syntheticDetails", "startingMaterial"],
  synthetic_starting_material_composition_missing: [
    "syntheticDetails",
    "startingMaterialComposition",
  ],
  synthetic_final_product_missing: ["syntheticDetails", "finalProduct"],
  synthetic_synthesis_date_missing: ["syntheticDetails", "synthesisDate"],
  synthetic_operator_name_missing: ["syntheticDetails", "operatorName"],
  relation_resource_type_missing: ["relations"],
  attachment_metadata_missing: ["attachments"],
  attachment_limit_exceeded: ["attachments"],
  user_not_verified: [],
};

export const publishedSampleSchema = createSampleSchema.superRefine(
  (value, ctx) => {
    const blockers = samplePublishBlockers(toPublishableFields(value));
    for (const blocker of blockers) {
      ctx.addIssue({
        code: "custom",
        path: BLOCKER_PATHS[blocker],
        message: `published sample must stay publishable: ${blocker}`,
        params: { code: blocker },
      });
    }
  },
);

export type PublishedSample = z.infer<typeof publishedSampleSchema>;
