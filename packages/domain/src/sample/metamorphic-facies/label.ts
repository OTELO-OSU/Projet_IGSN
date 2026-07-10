import { pathLabelKey } from "../path/label-key.ts";
import { type MetamorphicFacies } from "./vocabulary.ts";

// The i18n message key for a metamorphic facies code (shared by admin and
// frontend), e.g. `metamorphic_facies_zeolite`. Each app resolves it against its
// own paraglide runtime.
export function metamorphicFaciesLabelKey(facies: MetamorphicFacies): string {
  return pathLabelKey("metamorphic_facies", facies);
}
