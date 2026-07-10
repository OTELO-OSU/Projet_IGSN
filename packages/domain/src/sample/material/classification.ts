import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

// Hierarchical material classification (ADR 0011), a segment-keyed tree: every
// segment is defined once and may be reused under several parents (the path is
// the identity, ADR 0010). Stored in the DB as a dot-joined ltree path of codes;
// a sample's path may stop at any valid stop (see is-complete).
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
    optional: false,
  },
  igneous: { label: "igneous" },
  metamorphic: { label: "metamorphic" },
  sedimentary: { label: "sedimentary" },
  hydrothermal: { label: "hydrothermal" },
  unknown: { label: "unknown" },
  sediment: { label: "sediment" },
  mineral: { label: "mineral" },
  fossil: { label: "fossil" },
  synthetic_rock_mineral: { label: "synthetic_rock_mineral" },
  extraterrestrial_rock: { label: "extraterrestrial_rock" },
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

// A validated dot-joined path. Not a literal union: the valid set is derived
// from the tree at runtime and enforced by the schema, not the type.
export type MaterialPath = string;

export const materialPathSchema = z
  .string()
  .refine((path): path is MaterialPath => MATERIAL_PATHS.includes(path));
