import type { MaterialPath } from "../material/classification.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

export type LocationRequirement =
  | "required"
  | "optional"
  | "forbidden"
  | "undetermined";

const SYNTHETIC_ROOT = "synthetic_rock_mineral";
const RETURNED_SAMPLES_PATH = "extraterrestrial_rock.returned_samples";

export function locationRequirement(
  material: MaterialPath | null,
): LocationRequirement {
  if (material === null) return "undetermined";
  if (isPathAtOrUnder(material, SYNTHETIC_ROOT)) return "forbidden";
  if (isPathAtOrUnder(material, RETURNED_SAMPLES_PATH)) return "optional";
  if (RETURNED_SAMPLES_PATH.startsWith(`${material}.`)) return "undetermined";
  return "required";
}
