import { pathChildren } from "../path/children.ts";
import { MATERIAL_PATHS, type MaterialPath } from "./classification.ts";

// Direct children of a material path, or the roots when parent is null.
export function materialChildren(parent: MaterialPath | null): MaterialPath[] {
  return pathChildren(MATERIAL_PATHS, parent) as MaterialPath[];
}
