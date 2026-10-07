import type { SampleStatus } from "../sample.ts";

export const PUBLIC_SAMPLE_STATUSES = [
  "published",
  "withdrawn",
  "embargo",
] as const satisfies SampleStatus[];
