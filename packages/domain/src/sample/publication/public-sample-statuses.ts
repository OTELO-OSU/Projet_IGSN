import type { SampleStatus } from "../sample.ts";

export const REDACTED_SAMPLE_STATUSES = [
  "withdrawn",
  "embargo",
] as const satisfies SampleStatus[];

export const PUBLIC_SAMPLE_STATUSES = [
  "published",
  ...REDACTED_SAMPLE_STATUSES,
] as const satisfies SampleStatus[];
