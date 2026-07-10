import { isPathComplete } from "../path/is-complete.ts";
import { resolvePathNode } from "../path/resolve-node.ts";
import {
  SAMPLE_TYPE_TREE,
  SAMPLE_TYPES,
  type SampleType,
} from "./vocabulary.ts";

// Type's completeness policy, same read as material's: a node is an optional
// stop unless the tree marks it `optional: false`. The tree flags `core` (the
// only non-leaf), so a type is complete only at a leaf; an ancestor path
// ("core") is a valid draft but not publishable.
export function isSampleTypeComplete(type: SampleType): boolean {
  return isPathComplete(
    SAMPLE_TYPES,
    type,
    (node) => resolvePathNode(SAMPLE_TYPE_TREE, node)?.node.optional !== false,
  );
}
