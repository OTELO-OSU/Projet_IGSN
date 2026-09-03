import type { MaterialPath } from "../material/classification.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";
import { isSyntheticMaterial } from "../synthetic-details/is-synthetic-material.ts";

export function allowsLocation(material: MaterialPath | null): boolean {
  return (
    !isSyntheticMaterial(material) &&
    !isPathAtOrUnder(material, "extraterrestrial_rock.returned_samples")
  );
}
