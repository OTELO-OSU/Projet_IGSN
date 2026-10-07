import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import { locationSchema } from "../location/model.ts";
import { sampleSchema, type Sample } from "../sample.ts";
import { REDACTED_SAMPLE_STATUSES } from "./public-sample-statuses.ts";

export const withdrawnSampleSchema = sampleSchema
  .pick({
    name: true,
    nature: true,
    type: true,
    material: true,
    specificName: true,
  })
  .extend({
    status: z.enum(REDACTED_SAMPLE_STATUSES),
    igsn: igsnSchema,
    location: z
      .object({
        region: locationSchema.shape.region,
        localityName: locationSchema.shape.localityName,
      })
      .nullable(),
    collectorFirstname: freeTextSchema.nullable(),
    collectorLastname: freeTextSchema.nullable(),
  });

export type WithdrawnSample = z.infer<typeof withdrawnSampleSchema>;

export function toWithdrawnSample(sample: Sample): WithdrawnSample {
  const context = sample.scientificContext;
  return {
    status: withdrawnSampleSchema.shape.status.parse(sample.status),
    igsn: igsnSchema.parse(sample.igsn),
    name: sample.name,
    nature: sample.nature,
    type: sample.type,
    material: sample.material,
    specificName: sample.specificName,
    location: sample.location
      ? {
          region: sample.location.region ?? null,
          localityName: sample.location.localityName ?? null,
        }
      : null,
    collectorFirstname: context?.collectorFirstname ?? null,
    collectorLastname: context?.collectorLastname ?? null,
  };
}
