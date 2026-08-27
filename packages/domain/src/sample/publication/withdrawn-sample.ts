import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import { locationSchema } from "../location/model.ts";
import { sampleSchema, type Sample } from "../sample.ts";

export const withdrawnSampleSchema = sampleSchema
  .pick({ name: true, nature: true, type: true, material: true })
  .extend({
    status: z.literal("withdrawn"),
    igsn: igsnSchema,
    location: z
      .object({
        region: locationSchema.shape.region,
        localityName: locationSchema.shape.localityName,
      })
      .nullable(),
    collectorName: freeTextSchema.nullable(),
    collectionCurator: freeTextSchema.nullable(),
  });

export type WithdrawnSample = z.infer<typeof withdrawnSampleSchema>;

export function toWithdrawnSample(sample: Sample): WithdrawnSample {
  const context = sample.scientificContext;
  return {
    status: "withdrawn",
    igsn: igsnSchema.parse(sample.igsn),
    name: sample.name,
    nature: sample.nature,
    type: sample.type,
    material: sample.material,
    location: sample.location
      ? {
          region: sample.location.region ?? null,
          localityName: sample.location.localityName ?? null,
        }
      : null,
    collectorName: context?.collectorName ?? null,
    collectionCurator:
      context?.provenanceStatus === "historical_specimen"
        ? (context.collectionCurator ?? null)
        : null,
  };
}
