import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import { materialPathSchema } from "../material/classification.ts";

export const sampleParentSchema = z.object({
  id: z.uuid(),
  igsn: igsnSchema,
  name: freeTextSchema,
  material: materialPathSchema.nullable(),
});

export type SampleParent = z.infer<typeof sampleParentSchema>;
