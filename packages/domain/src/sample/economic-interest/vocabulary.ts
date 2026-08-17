import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

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

export const ECONOMIC_INTEREST_TREE: Record<EconomicInterestSegment, TreeNode> =
  economicInterestTree;

export const ECONOMIC_INTEREST_ROOTS = ["yes", "no", "unknown"] as const;

export const ECONOMIC_INTEREST_PATHS = expandPaths(
  ECONOMIC_INTEREST_TREE,
  ECONOMIC_INTEREST_ROOTS,
);

export const ECONOMIC_INTEREST_HIERARCHY = {
  roots: ECONOMIC_INTEREST_ROOTS,
  nodes: ECONOMIC_INTEREST_TREE,
};

export type EconomicInterest = string;

export const economicInterestSchema = z
  .string()
  .refine((path): path is EconomicInterest =>
    ECONOMIC_INTEREST_PATHS.includes(path),
  );
