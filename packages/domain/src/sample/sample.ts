import { z } from "zod";

import { natureSchema } from "./nature.ts";

export const nameSchema = z.string().trim().min(1);

export const sampleSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  nature: natureSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Sample = z.infer<typeof sampleSchema>;

export const createSampleSchema = z.strictObject({
  name: nameSchema,
  nature: natureSchema,
});

export type CreateSample = z.infer<typeof createSampleSchema>;
