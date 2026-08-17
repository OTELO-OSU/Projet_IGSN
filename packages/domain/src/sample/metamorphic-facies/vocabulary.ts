import { z } from "zod";

export const METAMORPHIC_FACIES = [
  "zeolite",
  "prehnite_pumpellyite",
  "greenschist",
  "blueschist",
  "eclogite",
  "amphibolite",
  "granulite",
  "hornfels_contact",
  "impactite",
] as const;

export const metamorphicFaciesSchema = z.enum(METAMORPHIC_FACIES);

export type MetamorphicFacies = z.infer<typeof metamorphicFaciesSchema>;

export function faciesFor(
  material: string | null,
): readonly MetamorphicFacies[] {
  if (!material) return [];
  const segments = material.split(".");
  if (segments[0] === "rock" && segments[1] === "metamorphic") {
    return METAMORPHIC_FACIES;
  }
  return [];
}
