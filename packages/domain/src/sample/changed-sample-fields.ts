import { atomizeChangeset, diff } from "json-diff-ts";

import { createSampleSchema, type CreateSample } from "./sample.ts";

const NOT_MAILED = ["attachments", "manualGroupIds"] as const;

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

const hasNoValue = (value: unknown): boolean =>
  value == null || (Array.isArray(value) && value.length === 0);

export const changedSampleFields = (
  current: SampleMailValues,
  next: SampleMailValues,
): SampleMailField[] => {
  const changed = new Set(
    atomizeChangeset(diff(current, next))
      .filter(
        ({ key, value, oldValue }) =>
          key !== "id" && !(hasNoValue(value) && hasNoValue(oldValue)),
      )
      .map(({ path }) => path.split(/[.[]/)[1]),
  );
  return SAMPLE_MAIL_FIELDS.filter((field) => changed.has(field));
};
