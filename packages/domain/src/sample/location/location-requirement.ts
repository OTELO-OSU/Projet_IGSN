import type { MaterialPath } from "../material/classification.ts";

import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

// The single source of truth consumed by the admin form (section visibility),
// createSampleSchema (forbidden case) and samplePublishBlockers (required case).
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
  // Synthetic samples derive their location from the structure ROR.
  if (isPathAtOrUnder(material, SYNTHETIC_ROOT)) return "forbidden";
  if (isPathAtOrUnder(material, RETURNED_SAMPLES_PATH)) return "optional";
  // A strict prefix of the returned-samples path (a bare extraterrestrial_rock)
  // can still refine either way, so the answer is not settled yet.
  if (RETURNED_SAMPLES_PATH.startsWith(`${material}.`)) return "undetermined";
  return "required";
}
