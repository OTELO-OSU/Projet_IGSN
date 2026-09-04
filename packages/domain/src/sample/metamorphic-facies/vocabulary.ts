import { z } from "zod";

import { isMetamorphicRock } from "../material/is-metamorphic-rock.ts";

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
  return isMetamorphicRock(material) ? METAMORPHIC_FACIES : [];
}
