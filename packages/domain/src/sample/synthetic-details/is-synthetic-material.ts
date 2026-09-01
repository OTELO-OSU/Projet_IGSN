import type { MaterialPath } from "../material/classification.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

export function isSyntheticMaterial(material: MaterialPath | null): boolean {
  return isPathAtOrUnder(material, "synthetic_rock_mineral");
}
