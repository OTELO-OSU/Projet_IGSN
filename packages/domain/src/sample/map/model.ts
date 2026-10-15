import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import { positionSchema } from "../location/model.ts";
import { listSamplesQuerySchema } from "../sample-validator.ts";

export const sampleMapPointsQuerySchema = listSamplesQuerySchema.omit({
  page: true,
  perPage: true,
  sort: true,
  order: true,
  ownership: true,
  status: true,
  existenceStatus: true,
  availabilityStatus: true,
  viewport: true,
});

export type SampleMapPointsQuery = z.infer<typeof sampleMapPointsQuerySchema>;

export const sampleMapPointsResponseSchema = z.object({
  data: z.object({
    numbers: z.array(z.number().int()),
    longitudes: z.array(z.number()),
    latitudes: z.array(z.number()),
  }),
});

export type SampleMapPointsResponse = z.infer<
  typeof sampleMapPointsResponseSchema
>;

export const MAX_MAP_DETAILS_NUMBERS = 500;

export const sampleMapDetailsQuerySchema = z.object({
  numbers: z
    .string()
    .transform((value) => value.split(",").map(Number))
    .pipe(z.array(z.int32().positive()).min(1).max(MAX_MAP_DETAILS_NUMBERS))
    .meta({ type: "string" }),
});

export type SampleMapDetailsQuery = z.infer<typeof sampleMapDetailsQuerySchema>;

export const sampleMapDetailSchema = z.object({
  internalNumber: z.number().int(),
  igsn: igsnSchema,
  name: freeTextSchema,
  position: positionSchema.optional(),
});

export type SampleMapDetail = z.infer<typeof sampleMapDetailSchema>;

export const sampleMapDetailsResponseSchema = z.object({
  data: z.array(sampleMapDetailSchema),
});

export type SampleMapDetailsResponse = z.infer<
  typeof sampleMapDetailsResponseSchema
>;
