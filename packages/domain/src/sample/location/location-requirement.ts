import type { MaterialPath } from "../material/classification.ts";

// Whether a sample of the given material must, may, or must not carry a
// location (ADR 0014). The single source of truth consumed by the admin form
// (section visibility), createSampleSchema (forbidden case) and
// samplePublishBlockers (required case). "undetermined" means the (possibly
// partial) material path does not settle the answer yet: the admin form hides
// the location section, since it cannot know how to validate it.
export type LocationRequirement =
  | "required"
  | "optional"
  | "forbidden"
  | "undetermined";

const SYNTHETIC_ROOT = "synthetic_rock_mineral";
const RETURNED_SAMPLES_PATH = "extraterrestrial_rock.returned_samples";

const isUnder = (path: string, ancestor: string): boolean =>
  path === ancestor || path.startsWith(`${ancestor}.`);

export function locationRequirement(
  material: MaterialPath | null,
): LocationRequirement {
  // An unclassified material cannot be judged yet.
  if (material === null) return "undetermined";
  // Synthetic samples derive their location from the structure ROR; forbidden.
  if (isUnder(material, SYNTHETIC_ROOT)) return "forbidden";
  // Extraterrestrial returned samples may omit an exact location.
  if (isUnder(material, RETURNED_SAMPLES_PATH)) return "optional";
  // A strict prefix of the returned-samples path (a bare extraterrestrial_rock)
  // can still refine either way, so the answer is not settled yet.
  if (RETURNED_SAMPLES_PATH.startsWith(`${material}.`)) return "undetermined";
  return "required";
}
