import type { SampleType } from "../type/vocabulary.ts";

import { isPathComplete } from "../path/is-complete.ts";
import { isOptionalAtOrAbove } from "../path/is-optional.ts";
import { MATERIAL_PATHS, type MaterialPath } from "./classification.ts";
import { materialHierarchyFor } from "./hierarchy-for-type.ts";

export function isMaterialComplete(
  path: MaterialPath,
  type: SampleType | null,
): boolean {
  const { nodes } = materialHierarchyFor(type);
  return isPathComplete(MATERIAL_PATHS, path, (node) =>
    isOptionalAtOrAbove(nodes, node),
  );
}
