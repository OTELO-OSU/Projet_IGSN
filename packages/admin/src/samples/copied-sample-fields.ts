import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { createSampleSchema } from "@projet-igsn/domain/sample/sample";

const NOT_COPIED = [
  "name",
  "localId",
  "localIdDescription",
  "nature",
  "relations",
  "attachments",
  "manualGroupIds",
  "parentIds",
] as const;

type CopiedField = Exclude<keyof CreateSample, (typeof NOT_COPIED)[number]>;

const COPIED_FIELDS: CopiedField[] = Object.keys(
  createSampleSchema.shape,
).filter((field): field is CopiedField =>
  NOT_COPIED.every((excluded) => field !== excluded),
);

export const copiedSampleFields = (sample: Sample): Partial<CreateSample> =>
  Object.fromEntries(
    COPIED_FIELDS.map((field) => [field, sample[field]]),
  ) as Partial<CreateSample>;
