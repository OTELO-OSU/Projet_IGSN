import type { CreateSample, Sample } from "../sample.ts";

import {
  type PublishBlocker,
  samplePublishBlockers,
  toPublishableFields,
} from "./sample-publish-blockers.ts";

export function publishBlockersOf(
  sample: Sample | CreateSample,
  uploadLimit: number,
  parents?: readonly (Pick<Sample, "id"> | null)[],
): PublishBlocker[] {
  return samplePublishBlockers(
    {
      ...toPublishableFields(sample),
      attachments: sample.attachments ?? [],
      parents,
    },
    uploadLimit,
  );
}

export function newPublishBlockers(
  current: Sample,
  next: CreateSample,
  uploadLimit: number,
): PublishBlocker[] {
  const existing = publishBlockersOf(current, uploadLimit, current.parents);
  return publishBlockersOf(next, uploadLimit, current.parents).filter(
    (blocker) => !existing.includes(blocker),
  );
}
