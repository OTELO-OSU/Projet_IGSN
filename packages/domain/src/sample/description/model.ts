import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { measurementSchema } from "../measurement.ts";
import { collectionDateSchema } from "./collection-date.ts";
import { massUnitSchema } from "./mass-unit.ts";
import { sizeUnitSchema } from "./size-unit.ts";
import { volumeUnitSchema } from "./volume-unit.ts";

export const descriptionSchema = z
  .object({
    collectionDate: collectionDateSchema.nullish(),
    oriented: z.boolean().nullish(),
    orientationExplanation: freeTextSchema.nullish(),
    openDescription: freeTextSchema.nullish(),
    length: measurementSchema(sizeUnitSchema).nullish(),
    width: measurementSchema(sizeUnitSchema).nullish(),
    thickness: measurementSchema(sizeUnitSchema).nullish(),
    mass: measurementSchema(massUnitSchema).nullish(),
    volume: measurementSchema(volumeUnitSchema).nullish(),
  })
  .superRefine((description, ctx) => {
    if (
      description.orientationExplanation != null &&
      description.oriented !== true
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["orientationExplanation"],
        message: "orientationExplanation requires oriented to be true",
      });
    }
  });

export type Description = z.infer<typeof descriptionSchema>;
