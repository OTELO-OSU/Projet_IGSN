import type { z } from "zod";

import { createSampleSchema } from "../sample.ts";
import { PUBLISH_BLOCKER_PATH } from "./publish-blocker-path.ts";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "./sample-publish-blockers.ts";

export const publishedSampleSchema = createSampleSchema.superRefine(
  (value, ctx) => {
    const blockers = samplePublishBlockers(toPublishableFields(value));
    for (const blocker of blockers) {
      ctx.addIssue({
        code: "custom",
        path: PUBLISH_BLOCKER_PATH[blocker],
        message: `published sample must stay publishable: ${blocker}`,
        params: { code: blocker },
      });
    }
  },
);

export type PublishedSample = z.infer<typeof publishedSampleSchema>;
