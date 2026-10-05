import { isPathComplete } from "../path/is-complete.ts";
import { isOptionalAtOrAbove } from "../path/is-optional.ts";
import {
  SAMPLE_TYPE_TREE,
  SAMPLE_TYPES,
  type SampleType,
} from "./vocabulary.ts";

export function isSampleTypeComplete(type: SampleType): boolean {
  return isPathComplete(SAMPLE_TYPES, type, (node) =>
    isOptionalAtOrAbove(SAMPLE_TYPE_TREE, node),
  );
}
