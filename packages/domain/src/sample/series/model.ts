import type { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { sampleParentSchema } from "../parent/model.ts";

export const sampleSeriesSchema = sampleParentSchema.extend({
  igsn: igsnSchema.nullable(),
});

export type SampleSeries = z.infer<typeof sampleSeriesSchema>;
