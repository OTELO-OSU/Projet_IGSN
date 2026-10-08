import { z } from "zod";

import { statsSchema } from "./model.ts";

export const statsResponseSchema = z.object({
  data: statsSchema,
});

export type StatsResponse = z.infer<typeof statsResponseSchema>;
