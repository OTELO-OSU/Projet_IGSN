import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

// Hierarchical collection-method vocabulary, a segment-keyed tree like material
// (see classification.ts). Every level is optional: any node is a valid stop, so
// nothing is marked `optional: false` and there is no completeness gate (a
// collection method never blocks publication).
//
// A choices entry or root must be a key of this tree; a mistyped literal trips
// the tree spec (vocabulary.spec.ts). A segment reused under several parents
// (e.g. `giant` under gravity and piston corers) is one key referenced from each.
const collectionMethodTree = {
  blasting: { label: "blasting" },
  camera_sled_camera_tow: { label: "camera_sled_camera_tow" },
  coring: {
    label: "coring",
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
  box_corer: { label: "box_corer" },
  camera_mounted: { label: "camera_mounted" },
  drill_corer: { label: "drill_corer" },
  free_fall_corer: { label: "free_fall_corer" },
  hand_held_corer: { label: "hand_held_corer" },
  kastenlot_corer: { label: "kastenlot_corer" },
  multi_corer: { label: "multi_corer" },
  rock_corer: { label: "rock_corer" },
  side_saddle_corer: { label: "side_saddle_corer" },
  submersible_mounted_corer: { label: "submersible_mounted_corer" },
  trigger_weight_corer: { label: "trigger_weight_corer" },
  vibrating_corer: { label: "vibrating_corer" },
  tube_without_corer: { label: "tube_without_corer" },
  russian_corer: { label: "russian_corer" },
  freeze_corer: { label: "freeze_corer" },
  hollow_auger_corer: { label: "hollow_auger_corer" },
  giant: { label: "giant" },
  pilot: { label: "pilot" },
  casq_corer: { label: "casq_corer" },
  stationary_piston: { label: "stationary_piston" },
  dredging: {
    label: "dredging",
    choices: ["dredging", "chain_bag", "chain_bag_dredge"],
  },
  "dredging.dredging": { label: "dredging" },
  chain_bag: { label: "chain_bag" },
  chain_bag_dredge: { label: "chain_bag_dredge" },
  experimental_apparatus: { label: "experimental_apparatus" },
  grab: {
    label: "grab",
    choices: ["grab", "hov", "rov"],
  },
  "grab.grab": { label: "grab" },
  hov: { label: "hov" },
  rov: { label: "rov" },
  manual: { label: "manual" },
  probe: { label: "probe" },
  sediment_trap: { label: "sediment_trap" },
  spatial_mission: { label: "spatial_mission" },
  suspended_sediment: { label: "suspended_sediment" },
  unknown: { label: "unknown" },
} satisfies Record<string, TreeNode>;

export type CollectionMethodSegment = keyof typeof collectionMethodTree;

// Widen values to TreeNode for uniform reads, keeping the literal keys.
export const COLLECTION_METHOD_TREE: Record<CollectionMethodSegment, TreeNode> =
  collectionMethodTree;

// Entry points: the segments a collection method can start from.
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
] as const satisfies readonly CollectionMethodSegment[];

export const COLLECTION_METHODS = expandPaths(
  COLLECTION_METHOD_TREE,
  COLLECTION_METHOD_ROOTS,
);

// A validated dot-joined path. Not a literal union: the valid set is derived
// from the tree at runtime and enforced by the schema, not the type.
export type CollectionMethod = string;

export const collectionMethodSchema = z
  .string()
  .refine((path): path is CollectionMethod =>
    COLLECTION_METHODS.includes(path),
  );
