import { z } from "zod";

export const STARTING_MATERIAL_NATURES = [
  "glass",
  "powder",
  "rock",
  "mineral",
  "fluid",
] as const;

export const startingMaterialNatureSchema = z.enum(STARTING_MATERIAL_NATURES);

export type StartingMaterialNature = z.infer<
  typeof startingMaterialNatureSchema
>;
