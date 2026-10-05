import { createSampleSchema } from "../sample.ts";
import { PUBLISH_BLOCKER_PATH } from "./publish-blocker-path.ts";
import {
  type PublishBlocker,
  samplePublishBlockers,
  toPublishableFields,
} from "./sample-publish-blockers.ts";

export function publishedEditSchema(existing: readonly PublishBlocker[]) {
  return createSampleSchema.superRefine((value, ctx) => {
    const blockers = samplePublishBlockers(toPublishableFields(value));
    for (const blocker of blockers) {
      if (existing.includes(blocker)) continue;
      ctx.addIssue({
        code: "custom",
        path: PUBLISH_BLOCKER_PATH[blocker],
        message: `published sample must stay publishable: ${blocker}`,
        params: { code: blocker },
      });
    }
  });
}

export const publishedSampleSchema = publishedEditSchema([]);
