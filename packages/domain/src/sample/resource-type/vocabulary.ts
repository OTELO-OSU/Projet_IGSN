import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

const resourceTypeTree = {
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

export type ResourceTypeSegment = keyof typeof resourceTypeTree;

export const RESOURCE_TYPE_TREE: Record<ResourceTypeSegment, TreeNode> =
  resourceTypeTree;

export const RESOURCE_TYPE_ROOTS = [
  "mineral_and_ore",
  "non_metallic",
  "hydrocarbon",
  "alternative",
] as const;

export const RESOURCE_TYPE_PATHS = expandPaths(
  RESOURCE_TYPE_TREE,
  RESOURCE_TYPE_ROOTS,
);

export const RESOURCE_TYPE_HIERARCHY = {
  roots: RESOURCE_TYPE_ROOTS,
  nodes: RESOURCE_TYPE_TREE,
};

export type ResourceType = string;

export const resourceTypeSchema = z
  .string()
  .refine((path): path is ResourceType => RESOURCE_TYPE_PATHS.includes(path));
