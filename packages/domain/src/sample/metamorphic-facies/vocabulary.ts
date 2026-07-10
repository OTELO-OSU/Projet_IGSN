import { z } from "zod";

// Metamorphic facies: a flat controlled vocabulary picked alongside the material
// classification whenever the rock is metamorphic. It is NOT part of the
// material tree (a separate sample field), and unlike igneous texture the set
// does not depend on the branch. Required to publish a metamorphic sample (see
// sample-publish-blockers). From the metamorphic screenshot.
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

// The facies valid for a material path: every facies once the material is under
// `rock.metamorphic`, none otherwise.
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
