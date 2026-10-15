import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

const collectionMethodTree = {
  coring: {
    optional: true,
    searchable: true,
    choices: [
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
  gravity_corer: {
    optional: true,
    choices: [
      "giant",
      "pilot",
      "free_fall_corer",
      "multi_corer",
      "casq_corer",
      "box_corer",
      "freeze_corer",
    ],
  },
  piston_corer: {
    optional: true,
    choices: ["giant", "stationary_piston"],
  },
  dredging: {
    optional: true,
    searchable: true,
    choices: ["chain_bag", "chain_bag_dredge"],
  },
  grab: {
    optional: true,
    searchable: true,
    choices: ["hov", "rov"],
  },
  blasting: { searchable: true },
  camera_sled_camera_tow: { searchable: true },
  experimental_apparatus: { searchable: true },
  manual: { searchable: true },
  probe: { searchable: true },
  sediment_trap: { searchable: true },
  spatial_mission: { searchable: true },
  suspended_sediment: { searchable: true },
  unknown: { searchable: true },
} satisfies Record<string, TreeNode>;

type CollectionMethodSegment = keyof typeof collectionMethodTree;

export const COLLECTION_METHOD_TREE: Record<CollectionMethodSegment, TreeNode> =
  collectionMethodTree;

const COLLECTION_METHOD_ROOTS = [
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

export const COLLECTION_METHOD_HIERARCHY = {
  roots: COLLECTION_METHOD_ROOTS,
  nodes: COLLECTION_METHOD_TREE,
};

export const collectionMethodSchema = z
  .string()
  .refine((path) => COLLECTION_METHODS.includes(path));
