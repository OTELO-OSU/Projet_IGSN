import { isPathComplete } from "../path/is-complete.ts";
import { resolvePathNode } from "../path/resolve-node.ts";
import {
  MATERIAL_PATHS,
  MATERIAL_TREE,
  type MaterialPath,
} from "./classification.ts";

// Material's completeness policy: a node is an optional stop unless the tree
// marks it `optional: false` (must be refined). The node is resolved by full
// path (longest suffix, like the tree itself), so a segment reused under several
// parents can carry different optionality via a dotted override key. See ADR 0011.
export function isMaterialComplete(path: MaterialPath): boolean {
  return isPathComplete(
    MATERIAL_PATHS,
    path,
    (node) => resolvePathNode(MATERIAL_TREE, node)?.node.optional !== false,
  );
}
