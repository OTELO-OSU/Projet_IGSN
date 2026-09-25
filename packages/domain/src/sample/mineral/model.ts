import { z } from "zod";

import { mineralByMindatId, strunzPathSchema } from "./mineral-hierarchy.ts";

export const MINERAL_ABUNDANCES = [
  "major",
  "minor",
  "accessory",
  "trace",
  "unknown",
] as const;

export const mineralAbundanceSchema = z.enum(MINERAL_ABUNDANCES);

export type MineralAbundance = z.infer<typeof mineralAbundanceSchema>;

export const mineralClassificationSchema = z
  .object({
    strunzId: strunzPathSchema,
    mindatId: z.number().int().nullish(),
    abundance: mineralAbundanceSchema.nullish(),
  })
  .refine(
    ({ strunzId, mindatId }) =>
      mindatId == null ||
      mineralByMindatId.get(mindatId)?.strunzId === strunzId,
    {
      path: ["mindatId"],
      message: "the mineral does not sit directly under this Strunz class",
    },
  );

export type MineralClassification = z.infer<typeof mineralClassificationSchema>;
