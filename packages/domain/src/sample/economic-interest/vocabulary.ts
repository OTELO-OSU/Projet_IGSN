import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

// Hierarchical economic-interest vocabulary, a segment-keyed tree like material
// (see classification.ts). The full path is rooted at the yes/no/unknown answer:
// `no` and `unknown` are childless leaves; `yes` branches into the resource type
// (level 2), then the sub-list for that type (ore deposit type for
// mineral_and_ore, a leaf list otherwise, level 3), then the uranium deposit
// type (level 4, only under mineral_and_ore.uranium).
//
// Every level is optional: any node is a valid stop, so every non-leaf is
// marked `optional: true` and there is no completeness gate (economic interest
// never blocks publication, like collection method).
//
// A segment with no entry (kimberlites, stone, coal...) is a childless leaf
// labelled by its own code (see tree-node.ts), reusable under several parents
// (e.g. `hydrogen` under hydrocarbon and alternative, `other` under many). No
// dotted self-child overrides are needed: no node lists itself in its choices,
// so expandPaths never cycles.
const economicInterestTree = {
  yes: {
    optional: true,
    childLabel: "resource_type",
    choices: ["mineral_and_ore", "non_metallic", "hydrocarbon", "alternative"],
  },
  mineral_and_ore: {
    optional: true,
    childLabel: "ore_deposit_type",
    choices: [
      "uranium",
      "kimberlites",
      "magmatic_nickel_copper_pge_sulfide",
      "stratiform_chromite",
      "rare_metal_granite",
      "black_smoker_chimney",
      "vms",
      "porphyry",
      "carbonatites",
      "pegmatitic",
      "replacement",
      "orogenic_gold",
      "manto_type",
      "chimney_type",
      "skarn",
      "greisens",
      "hydrothermal",
      "epithermal",
      "mesothermal",
      "vein",
      "mvt",
      "sedex",
      "laterites",
      "banded_iron_formation",
      "placer",
      "polymetallic_nodules",
      "evaporite",
      "fumarole",
    ],
  },
  uranium: {
    optional: true,
    choices: [
      "unconformity_related",
      "sandstone",
      "quartz_pebble_conglomerate",
      "breccia_complex",
      "vein",
      "intrusive",
      "phosphorite",
      "collapse_breccia_pipe",
      "volcanic",
      "surficial",
      "metasomatite",
      "metamorphic",
      "lignite",
      "black_shale",
      "other",
    ],
  },
  non_metallic: {
    optional: true,
    choices: [
      "stone",
      "sand",
      "clay",
      "salts_and_evaporite",
      "industrial_rocks_minerals",
      "precious_stones_and_gems",
      "water",
      "other",
    ],
  },
  hydrocarbon: {
    optional: true,
    choices: [
      "conventional_oil",
      "unconventional_oil",
      "conventional_gas",
      "unconventional_gas",
      "coal",
      "peat",
      "hydrogen",
      "methane_hydrates",
      "other",
    ],
  },
  alternative: {
    optional: true,
    choices: ["hydrogen", "helium", "geothermal", "storage_rocks", "other"],
  },
} satisfies Record<string, TreeNode>;

export type EconomicInterestSegment = keyof typeof economicInterestTree;

// Widen values to TreeNode for uniform reads, keeping the literal keys.
export const ECONOMIC_INTEREST_TREE: Record<EconomicInterestSegment, TreeNode> =
  economicInterestTree;

// Entry points: the yes/no/unknown answer an economic interest starts from.
// `yes` is a branch (has a tree entry); `no` and `unknown` are childless leaves.
// A typo here surfaces in the label-coverage spec.
export const ECONOMIC_INTEREST_ROOTS = ["yes", "no", "unknown"] as const;

export const ECONOMIC_INTEREST_PATHS = expandPaths(
  ECONOMIC_INTEREST_TREE,
  ECONOMIC_INTEREST_ROOTS,
);

// The vocabulary as one self-describing bundle for HierarchySelectField.
export const ECONOMIC_INTEREST_HIERARCHY = {
  roots: ECONOMIC_INTEREST_ROOTS,
  nodes: ECONOMIC_INTEREST_TREE,
};

// A validated dot-joined path. Not a literal union: the valid set is derived
// from the tree at runtime and enforced by the schema, not the type.
export type EconomicInterest = string;

export const economicInterestSchema = z
  .string()
  .refine((path): path is EconomicInterest =>
    ECONOMIC_INTEREST_PATHS.includes(path),
  );
