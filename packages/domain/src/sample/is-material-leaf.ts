import { materialChildren } from "./material-children.ts";
import { type MaterialPath } from "./material.ts";

// A leaf has no deeper classification. Only leaves are publishable.
export function isMaterialLeaf(path: MaterialPath): boolean {
  return materialChildren(path).length === 0;
}
