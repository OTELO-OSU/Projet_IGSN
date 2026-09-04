import { z } from "zod";

import { isMetamorphicRock } from "../material/is-metamorphic-rock.ts";

export const METAMORPHIC_FABRICS = [
  "slaty_cleavage",
  "phyllitic",
  "schistose",
  "gneissic",
  "granoblastic",
  "hornfelsic",
  "mylonitic",
  "cataclastic",
  "massive",
] as const;

export const metamorphicFabricSchema = z.enum(METAMORPHIC_FABRICS);

export type MetamorphicFabric = z.infer<typeof metamorphicFabricSchema>;

export function fabricsFor(
  material: string | null,
): readonly MetamorphicFabric[] {
  return isMetamorphicRock(material) ? METAMORPHIC_FABRICS : [];
}
