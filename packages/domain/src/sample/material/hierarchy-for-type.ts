import type { SampleType } from "../type/vocabulary.ts";

import {
  MATERIAL_HIERARCHY,
  MATERIAL_ROOTS,
  MATERIAL_TREE,
} from "./classification.ts";

export function materialHierarchyFor(type: SampleType | null) {
  if (type !== "serie_of_sample.core") return MATERIAL_HIERARCHY;
  return {
    roots: MATERIAL_ROOTS,
    nodes: {
      ...MATERIAL_TREE,
      rock_and_sediment: { ...MATERIAL_TREE.rock_and_sediment, optional: true },
    },
  };
}
