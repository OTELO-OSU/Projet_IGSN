import { pathLabelKey } from "../path/label-key.ts";
import { type SampleType } from "./vocabulary.ts";

// The i18n message key for a sample-type node (see pathLabelKey), e.g.
// `type_core`.
export function sampleTypeLabelKey(type: SampleType): string {
  return pathLabelKey("type", type);
}
