import { isPathComplete } from "../path/is-complete.ts";
import { isOptionalAtOrAbove } from "../path/is-optional.ts";
import {
  MATERIAL_PATHS,
  MATERIAL_TREE,
  type MaterialPath,
} from "./classification.ts";

export function isMaterialComplete(path: MaterialPath): boolean {
  return isPathComplete(MATERIAL_PATHS, path, (node) =>
    isOptionalAtOrAbove(MATERIAL_TREE, node),
  );
}
