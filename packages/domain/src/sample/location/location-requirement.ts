import type { MaterialPath } from "../material/classification.ts";

// Whether a sample of the given material must, may, or must not carry a location
// (ADR 0014). The single source of truth consumed by the admin form (tab
// visibility), createSampleSchema (forbidden case) and samplePublishBlockers
// (required case).
export type LocationRequirement = "required" | "optional" | "forbidden";

const SYNTHETIC_ROOT = "synthetic_rock_mineral";
const RETURNED_SAMPLES_PATH = "extraterrestrial_rock.returned_samples";

const isUnder = (path: string, ancestor: string): boolean =>
  path === ancestor || path.startsWith(`${ancestor}.`);

export function locationRequirement(
  material: MaterialPath | null,
): LocationRequirement {
  // Synthetic samples derive their location from the structure ROR; forbidden.
  if (material !== null && isUnder(material, SYNTHETIC_ROOT))
    return "forbidden";
  // Extraterrestrial returned samples may omit an exact location.
  if (material !== null && isUnder(material, RETURNED_SAMPLES_PATH))
    return "optional";
  // A null/unclassified material cannot be judged yet (material completeness
  // gates publication separately), so it does not require a location.
  if (material === null) return "optional";
  return "required";
}
