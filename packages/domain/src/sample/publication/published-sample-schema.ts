import type { z } from "zod";

import { createSampleSchema } from "../sample.ts";
import {
  type PublishBlocker,
  samplePublishBlockers,
  toPublishableFields,
} from "./sample-publish-blockers.ts";

const BLOCKER_PATHS: Record<PublishBlocker, PropertyKey[]> = {
  type_missing: ["type"],
  type_incomplete: ["type"],
  material_missing: ["material"],
  material_incomplete: ["material"],
  metamorphic_facies_missing: ["metamorphicFacies"],
  location_position_missing: ["location"],
  collection_date_missing: ["description", "collectionDate"],
  numeric_age_unit_missing: ["age", "numericAgeUnit"],
  numeric_age_reference_missing: ["age", "numericAgeYearsUnit"],
  numeric_age_range_incomplete: ["age"],
  geological_age_range_incomplete: ["age"],
  elevation_incomplete: ["location", "position", "elevation"],
  availability_missing: ["availability"],
  scientific_context_missing: ["scientificContext", "provenanceStatus"],
  funder_organization_missing: ["scientificContext", "funderOrganization"],
  research_program_name_missing: ["scientificContext", "researchProgramName"],
  research_program_chief_missing: ["scientificContext", "researchProgramChief"],
  research_structure_missing: ["scientificContext", "researchStructure"],
  collector_name_missing: ["scientificContext", "collectorName"],
  collection_curator_missing: ["scientificContext", "collectionCurator"],
  collection_origin_missing: ["scientificContext", "collectionOrigin"],
  attachment_limit_exceeded: ["attachments"],
  // No field carries the account status, and this schema never passes a
  // publisher, so the blocker cannot be raised here: form-level path.
  user_not_verified: [],
};

// One bar for the first publish and for updates to a published sample; only
// drafts keep createSampleSchema.
export const publishedSampleSchema = createSampleSchema.superRefine(
  (value, ctx) => {
    // `attachments` is deliberately left out: this schema is static and cannot
    // know the deployment's upload limit, so the api PUT validator enforces the
    // count with the configured value instead.
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
