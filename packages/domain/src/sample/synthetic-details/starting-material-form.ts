import { z } from "zod";

export const STARTING_MATERIAL_FORMS = [
  "glass",
  "powder",
  "rock",
  "mineral",
  "fluid",
] as const;

export const startingMaterialFormSchema = z.enum(STARTING_MATERIAL_FORMS);

export type StartingMaterialForm = z.infer<typeof startingMaterialFormSchema>;
