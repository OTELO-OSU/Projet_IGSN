import { z } from "zod";

import { positionSchema } from "../location/model.ts";
import { sampleParentSchema } from "../parent/model.ts";
import { bboxSchema, listSamplesQuerySchema } from "../sample-validator.ts";

export const sampleMapQuerySchema = listSamplesQuerySchema
  .omit({
    page: true,
    perPage: true,
    sort: true,
    order: true,
    ownership: true,
    status: true,
    existenceStatus: true,
    availabilityStatus: true,
  })
  .extend({
    viewport: bboxSchema,
    zoom: z.coerce.number().int().min(0).max(20),
  });

export type SampleMapQuery = z.infer<typeof sampleMapQuerySchema>;

const extentSchema = z.object({
  west: z.number(),
  south: z.number(),
  east: z.number(),
  north: z.number(),
});

export const sampleMapClusterSchema = z.object({
  longitude: z.number(),
  latitude: z.number(),
  count: z.number().int().positive(),
  extent: extentSchema,
  sample: sampleParentSchema
    .omit({ id: true })
    .extend({ position: positionSchema.optional() })
    .optional(),
});

export type SampleMapCluster = z.infer<typeof sampleMapClusterSchema>;

export const sampleMapResponseSchema = z.object({
  data: z.array(sampleMapClusterSchema),
  meta: z.object({ extent: extentSchema.nullable() }),
});

export type SampleMapResponse = z.infer<typeof sampleMapResponseSchema>;
