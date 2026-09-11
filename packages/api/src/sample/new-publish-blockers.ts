import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { uploadLimit } from "./upload-limit.ts";

function blockersOf(sample: Sample | CreateSample): PublishBlocker[] {
  return samplePublishBlockers(
    {
      ...toPublishableFields(sample),
      attachments: sample.attachments ?? [],
    },
    uploadLimit,
  );
}

export function newPublishBlockers(
  current: Sample,
  next: CreateSample,
): PublishBlocker[] {
  const existing = blockersOf(current);
  return blockersOf(next).filter((blocker) => !existing.includes(blocker));
}
