import { isPathComplete } from "../path/is-complete.ts";
import { resolvePathNode } from "../path/resolve-node.ts";
import {
  MATERIAL_PATHS,
  MATERIAL_TREE,
  type MaterialPath,
} from "./classification.ts";

export function isMaterialComplete(path: MaterialPath): boolean {
  return isPathComplete(
    MATERIAL_PATHS,
    path,
    (node) => resolvePathNode(MATERIAL_TREE, node)?.node.optional === true,
  );
}
