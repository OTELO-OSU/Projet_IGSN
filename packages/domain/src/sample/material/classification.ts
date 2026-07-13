import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";
import { extraterrestrialRockTree } from "./classification/extraterrestrial-rock-subtree.ts";
import { metamorphicTree } from "./classification/metamorphic-subtree.ts";
import { rockTree } from "./classification/rock-subtree.ts";
import { sedimentTree } from "./classification/sediment-subtree.ts";

// Hierarchical material classification (ADR 0011), a segment-keyed tree: every
// segment is defined once and may be reused under several parents (the path is
// the identity, ADR 0010). Stored in the DB as a dot-joined ltree path of codes;
// a sample's path may stop at any valid stop (see is-complete).
//
// The roots live here; the large subtrees are spread in from their own files
// for readability (rock-subtree.ts, sediment-subtree.ts,
// extraterrestrial-rock-subtree.ts). A segment with no entry (plain leaves like
// `mineral`, `fossil`, `other`) defaults to a childless leaf labelled by its
// own code (see tree-node.ts).
const materialTree = {
  rock: {
    choices: [
      "igneous",
      "metamorphic",
      "sedimentary",
      "hydrothermal",
      "unknown",
    ],
  },
  sediment: {
    choices: [
      "exogenous_detritic",
      "volcano_detritic",
      "biogenic",
      "physico_chemical",
    ],
  },
  extraterrestrial_rock: {
    choices: ["returned_samples", "meteorites", "micrometeorites"],
  },

  ...rockTree,
  ...metamorphicTree,
  ...sedimentTree,
  ...extraterrestrialRockTree,
} satisfies Record<string, TreeNode>;

export type MaterialSegment = keyof typeof materialTree;

// Widen values to TreeNode for uniform reads, keeping the literal keys.
export const MATERIAL_TREE: Record<MaterialSegment, TreeNode> = materialTree;

// Entry points: the segments a classification can start from. A root without a
// tree entry is a plain leaf; a typo here surfaces in the apps' label-coverage
// specs (an untranslatable segment).
export const MATERIAL_ROOTS = [
  "rock",
  "sediment",
  "mineral",
  "fossil",
  "synthetic_rock_mineral",
  "extraterrestrial_rock",
] as const;

export const MATERIAL_PATHS = expandPaths(MATERIAL_TREE, MATERIAL_ROOTS);

// The vocabulary as one self-describing bundle for HierarchySelectField.
export const MATERIAL_HIERARCHY = {
  roots: MATERIAL_ROOTS,
  nodes: MATERIAL_TREE,
};

// A validated dot-joined path. Not a literal union: the valid set is derived
// from the tree at runtime and enforced by the schema, not the type.
export type MaterialPath = string;

export const materialPathSchema = z
  .string()
  .refine((path): path is MaterialPath => MATERIAL_PATHS.includes(path));
