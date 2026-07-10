import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";
import { rockTree } from "./classification/rock-subtree.ts";
import { sedimentTree } from "./classification/sediment-subtree.ts";

// Hierarchical material classification (ADR 0011), a segment-keyed tree: every
// segment is defined once and may be reused under several parents (the path is
// the identity, ADR 0010). Stored in the DB as a dot-joined ltree path of codes;
// a sample's path may stop at any valid stop (see is-complete).
//
// The roots live here; the two large subtrees are spread in from their own files
// for readability (rock-subtree.ts, sediment-subtree.ts). `other` is a single
// shared leaf reused under every parent of both subtrees.
const materialTree = {
  rock: {
    label: "rock",
    choices: [
      "igneous",
      "metamorphic",
      "sedimentary",
      "hydrothermal",
      "unknown",
    ],
  },
  sediment: {
    label: "sediment",
    choices: [
      "exogenous_detritic",
      "volcano_detritic",
      "biogenic",
      "physico_chemical",
    ],
  },
  mineral: { label: "mineral" },
  fossil: { label: "fossil" },
  synthetic_rock_mineral: { label: "synthetic_rock_mineral" },
  extraterrestrial_rock: { label: "extraterrestrial_rock" },
  other: { label: "other" },

  ...rockTree,
  ...sedimentTree,
} satisfies Record<string, TreeNode>;

export type MaterialSegment = keyof typeof materialTree;

// Widen values to TreeNode for uniform reads, keeping the literal keys.
export const MATERIAL_TREE: Record<MaterialSegment, TreeNode> = materialTree;

// Entry points: the segments a classification can start from.
export const MATERIAL_ROOTS = [
  "rock",
  "sediment",
  "mineral",
  "fossil",
  "synthetic_rock_mineral",
  "extraterrestrial_rock",
] as const satisfies readonly MaterialSegment[];

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
