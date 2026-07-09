import { MATERIAL_PATHS, type MaterialPath } from "./classification.ts";
import { isMaterialComplete } from "./is-complete.ts";

// The material vocabulary as one bundle for HierarchySelectField: the flat paths
// plus its completeness policy (a node may stop unless it must be refined).
export const materialHierarchy = {
  paths: MATERIAL_PATHS,
  canStopAt: isMaterialComplete,
} satisfies {
  paths: readonly MaterialPath[];
  canStopAt: (path: MaterialPath) => boolean;
};
