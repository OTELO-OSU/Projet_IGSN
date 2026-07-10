import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

// Hierarchical collection-method vocabulary, a segment-keyed tree like material
// (see classification.ts). Every level is optional: any node is a valid stop, so
// every non-leaf is marked `optional: true` and there is no completeness gate (a
// collection method never blocks publication).
//
// A segment with no entry (blasting, giant...) is a childless leaf labelled by
// its own code (see tree-node.ts), reusable under several parents (e.g. `giant`
// under gravity and piston corers). Each self-child (`coring.coring`...) keeps a
// dotted childless override so expandPaths stops there instead of cycling.
const collectionMethodTree = {
  coring: {
    label: "coring",
    optional: true,
    choices: [
      "coring",
      "box_corer",
      "camera_mounted",
      "drill_corer",
      "free_fall_corer",
      "gravity_corer",
      "hand_held_corer",
      "kastenlot_corer",
      "multi_corer",
      "piston_corer",
      "rock_corer",
      "side_saddle_corer",
      "submersible_mounted_corer",
      "trigger_weight_corer",
      "vibrating_corer",
      "tube_without_corer",
      "russian_corer",
      "freeze_corer",
      "hollow_auger_corer",
    ],
  },
  "coring.coring": { label: "coring" },
  gravity_corer: {
    label: "gravity_corer",
    optional: true,
    choices: [
      "gravity_corer",
      "giant",
      "pilot",
      "free_fall_corer",
      "multi_corer",
      "casq_corer",
      "box_corer",
      "freeze_corer",
    ],
  },
  "gravity_corer.gravity_corer": { label: "gravity_corer" },
  piston_corer: {
    label: "piston_corer",
    optional: true,
    choices: [
      "giant",
      "stationary_piston",
      "rock_corer",
      "side_saddle_corer",
      "submersible_mounted_corer",
      "trigger_weight_corer",
      "vibrating_corer",
      "tube_without_corer",
      "russian_corer",
      "freeze_corer",
      "hollow_auger_corer",
    ],
  },
  dredging: {
    label: "dredging",
    optional: true,
    choices: ["dredging", "chain_bag", "chain_bag_dredge"],
  },
  "dredging.dredging": { label: "dredging" },
  grab: {
    label: "grab",
    optional: true,
    choices: ["grab", "hov", "rov"],
  },
  "grab.grab": { label: "grab" },
} satisfies Record<string, TreeNode>;

export type CollectionMethodSegment = keyof typeof collectionMethodTree;

// Widen values to TreeNode for uniform reads, keeping the literal keys.
export const COLLECTION_METHOD_TREE: Record<CollectionMethodSegment, TreeNode> =
  collectionMethodTree;

// Entry points: the segments a collection method can start from. A root without
// a tree entry is a plain leaf; a typo here surfaces in the apps' label-coverage
// specs.
export const COLLECTION_METHOD_ROOTS = [
  "blasting",
  "camera_sled_camera_tow",
  "coring",
  "dredging",
  "experimental_apparatus",
  "grab",
  "manual",
  "probe",
  "sediment_trap",
  "spatial_mission",
  "suspended_sediment",
  "unknown",
] as const;

export const COLLECTION_METHODS = expandPaths(
  COLLECTION_METHOD_TREE,
  COLLECTION_METHOD_ROOTS,
);

// The vocabulary as one self-describing bundle for HierarchySelectField.
export const COLLECTION_METHOD_HIERARCHY = {
  roots: COLLECTION_METHOD_ROOTS,
  nodes: COLLECTION_METHOD_TREE,
};

// A validated dot-joined path. Not a literal union: the valid set is derived
// from the tree at runtime and enforced by the schema, not the type.
export type CollectionMethod = string;

export const collectionMethodSchema = z
  .string()
  .refine((path): path is CollectionMethod =>
    COLLECTION_METHODS.includes(path),
  );
