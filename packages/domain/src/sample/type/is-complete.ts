import { isPathComplete } from "../path/is-complete.ts";
import { SAMPLE_TYPES, type SampleType } from "./vocabulary.ts";

// Type's completeness policy: nothing is optional, so a type is complete only at
// a leaf. An ancestor path ("core") is a valid draft but not publishable.
export function isSampleTypeComplete(type: SampleType): boolean {
  return isPathComplete(SAMPLE_TYPES, type, () => false);
}
