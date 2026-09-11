import { changedPaths } from "./changed-paths.ts";
import { createSampleSchema, type CreateSample } from "./sample.ts";

const NOT_MAILED = ["attachments", "manualGroupIds", "parentIds"] as const;

export type SampleMailField = Exclude<
  keyof CreateSample,
  (typeof NOT_MAILED)[number]
>;

const SAMPLE_MAIL_FIELDS: SampleMailField[] = Object.keys(
  createSampleSchema.shape,
).filter((field): field is SampleMailField =>
  NOT_MAILED.every((excluded) => field !== excluded),
);

type SampleMailValues = Partial<Record<SampleMailField, unknown>>;

export const changedSampleFields = (
  current: SampleMailValues,
  next: SampleMailValues,
): SampleMailField[] => {
  const changed = new Set(
    changedPaths(current, next).map((path) => path.split(".")[0]),
  );
  return SAMPLE_MAIL_FIELDS.filter((field) => changed.has(field));
};
