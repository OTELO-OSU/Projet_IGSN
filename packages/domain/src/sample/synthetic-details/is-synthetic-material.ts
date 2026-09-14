import type { MaterialPath } from "../material/classification.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

export const SYNTHETIC_MATERIAL_ROOT =
  "rock_and_sediment.synthetic_rock_mineral";

export function isSyntheticMaterial(material: MaterialPath | null): boolean {
  return isPathAtOrUnder(material, SYNTHETIC_MATERIAL_ROOT);
}
