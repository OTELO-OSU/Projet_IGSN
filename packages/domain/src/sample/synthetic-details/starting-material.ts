import { z } from "zod";

export const STARTING_MATERIALS = ["natural", "synthetic", "mixture"] as const;

export const startingMaterialSchema = z.enum(STARTING_MATERIALS);

export type StartingMaterial = z.infer<typeof startingMaterialSchema>;
