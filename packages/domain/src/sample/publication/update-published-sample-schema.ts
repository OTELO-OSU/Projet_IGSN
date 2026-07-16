import type { z } from "zod";

import { createSampleSchema } from "../sample.ts";
import {
  type PublishBlocker,
  samplePublishBlockers,
} from "./sample-publish-blockers.ts";

// Where each publish blocker pins its issue on the update payload, so a form
// can show the error on the offending field. Exhaustive: a new blocker fails
// to compile until it chooses a path.
const BLOCKER_PATHS: Record<PublishBlocker, PropertyKey[]> = {
  type_missing: ["type"],
  type_incomplete: ["type"],
  material_missing: ["material"],
  material_incomplete: ["material"],
  metamorphic_facies_missing: ["metamorphicFacies"],
  location_position_missing: ["location"],
  collection_date_missing: ["description", "collectionDate"],
};

// An update to a published sample must keep it publishable: the create shape,
// plus every publish blocker raised as an issue (samplePublishBlockers stays
// the single source of truth; params.code carries the blocker so consumers
// translate without matching message text). Drafts keep createSampleSchema.
export const updatePublishedSampleSchema = createSampleSchema.superRefine(
  (value, ctx) => {
    const blockers = samplePublishBlockers({
      type: value.type ?? null,
      material: value.material ?? null,
      metamorphicFacies: value.metamorphicFacies ?? null,
      location: value.location ?? null,
      description: value.description ?? null,
    });
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

export type UpdatePublishedSample = z.infer<typeof updatePublishedSampleSchema>;
