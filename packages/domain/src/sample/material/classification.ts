import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";
import { extraterrestrialRockTree } from "./classification/extraterrestrial-rock-subtree.ts";
import { metamorphicTree } from "./classification/metamorphic-subtree.ts";
import { rockTree } from "./classification/rock-subtree.ts";
import { sedimentTree } from "./classification/sediment-subtree.ts";

const materialTree = {
  rock: {
    searchable: true,
    choices: [
      "igneous",
      "metamorphic",
      "sedimentary",
      "hydrothermal",
      "xenolithic_rock",
      "unknown",
    ],
  },
  sediment: {
    searchable: true,
    choices: [
      "exogenous_detritic",
      "volcano_detritic",
      "biogenic",
      "physico_chemical",
    ],
  },
  extraterrestrial_rock: {
    searchable: true,
    choices: ["returned_samples", "meteorites", "micrometeorites"],
  },
  mineral: { searchable: true },
  fossil: { searchable: true },
  synthetic_rock_mineral: { searchable: true },

  ...rockTree,
  ...metamorphicTree,
  ...sedimentTree,
  ...extraterrestrialRockTree,
} satisfies Record<string, TreeNode>;

export type MaterialSegment = keyof typeof materialTree;

export const MATERIAL_TREE: Record<MaterialSegment, TreeNode> = materialTree;

export const MATERIAL_ROOTS = [
  "rock",
  "sediment",
  "mineral",
  "fossil",
  "synthetic_rock_mineral",
  "extraterrestrial_rock",
] as const;

export const MATERIAL_PATHS = expandPaths(MATERIAL_TREE, MATERIAL_ROOTS);

export const MATERIAL_HIERARCHY = {
  roots: MATERIAL_ROOTS,
  nodes: MATERIAL_TREE,
};

export type MaterialPath = string;

export const materialPathSchema = z
  .string()
  .refine((path): path is MaterialPath => MATERIAL_PATHS.includes(path));
