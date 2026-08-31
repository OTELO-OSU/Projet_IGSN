import type { MaterialPath } from "../material/classification.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

const REFUSED_MATERIALS = [
  "synthetic_rock_mineral",
  "extraterrestrial_rock.returned_samples",
];

export function allowsLocation(material: MaterialPath | null): boolean {
  return !REFUSED_MATERIALS.some((refused) =>
    isPathAtOrUnder(material, refused),
  );
}
