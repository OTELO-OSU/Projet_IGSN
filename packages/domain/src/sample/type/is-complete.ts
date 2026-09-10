import { isPathComplete } from "../path/is-complete.ts";
import { isOptionalAtOrAbove } from "../path/is-optional.ts";
import {
  SAMPLE_TYPE_TREE,
  SAMPLE_TYPES,
  type SampleType,
} from "./vocabulary.ts";

// ponytail: today this equals `() => false`, kept as the tree read on purpose
// (ADR 0012) so the tree stays the single source of truth if a type node ever
// goes optional.
export function isSampleTypeComplete(type: SampleType): boolean {
  return isPathComplete(SAMPLE_TYPES, type, (node) =>
    isOptionalAtOrAbove(SAMPLE_TYPE_TREE, node),
  );
}
