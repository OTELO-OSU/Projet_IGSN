import { z } from "zod";

import { dateRangeSchema } from "../date-range.ts";
import { freeTextSchema } from "../free-text.ts";
import { processStepKindSchema } from "./kind.ts";

export const sampleProcessStepSchema = z.object({
  kind: processStepKindSchema,
  date: dateRangeSchema("process_date").nullish(),
  description: freeTextSchema.nullish(),
});

export type SampleProcessStep = z.infer<typeof sampleProcessStepSchema>;
