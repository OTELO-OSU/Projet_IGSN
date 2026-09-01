import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

const geomorphologicalEnvironmentTree = {
  continental_zone: {
    optional: true,
    choices: [
      "badlands",
      "sedimentary_basin",
      "cave",
      "grotto",
      "moraine",
      "paleodelta",
      "palaeolake",
      "paleosol_loess",
      "palaeovalley",
      "sea_beach",
      "alluvial_deposits",
      "plain",
      "alluvial_plain",
      "bedrock",
      "alluvial_terrace",
    ],
  },
  natural_fresh_water: {
    optional: true,
    choices: [
      "old_water_dependant_area",
      "water_dependant_area",
      "delta",
      "foreshore",
      "estuary",
      "river",
      "gours",
      "lake",
      "lake_endokarst",
      "lagoon",
      "floodplain",
      "ria",
    ],
  },
  wetland: {
    optional: true,
    choices: [
      "coastal_littoral_swamp",
      "salty_deltaic_swamp",
      "fresh_water_swamp",
      "peat_bog",
    ],
  },
  artificial_water: {
    optional: true,
    choices: [
      "reservoir",
      "wet_dock_harbour",
      "pond",
      "gravel_pit",
      "dyked_swamp",
      "close_depression",
      "canal",
      "sewer",
    ],
  },
  marine_zone: {
    optional: true,
    choices: [
      "bay",
      "submarine_canyon",
      "channel",
      "coastal",
      "volcanic_edifice_submarine",
      "fjord",
      "deep_ocean_floor",
      "continental_rise",
      "gulf",
      "offshore",
      "slope_instability_submarine",
      "carbonate_mound_submarine",
      "seamount",
      "abyssal_feature",
      "continental_shelf",
      "carbonate_platform_systems_submarine",
      "accretionary_prism_submarine",
      "turbidite_system_submarine",
      "continental_slope",
      "ocean_trench",
    ],
  },
  glaciated_zone: {
    optional: true,
    choices: [
      "ice_caps",
      "ice_sheet",
      "ice_shelves",
      "cirque_and_valley_glaciers",
      "snow_packs",
      "glacierets",
    ],
  },
} satisfies Record<string, TreeNode>;

export type GeomorphologicalEnvironmentSegment =
  keyof typeof geomorphologicalEnvironmentTree;

export const GEOMORPHOLOGICAL_ENVIRONMENT_TREE: Record<
  GeomorphologicalEnvironmentSegment,
  TreeNode
> = geomorphologicalEnvironmentTree;

export const GEOMORPHOLOGICAL_ENVIRONMENT_ROOTS = Object.keys(
  GEOMORPHOLOGICAL_ENVIRONMENT_TREE,
);

export const GEOMORPHOLOGICAL_ENVIRONMENTS = expandPaths(
  GEOMORPHOLOGICAL_ENVIRONMENT_TREE,
  GEOMORPHOLOGICAL_ENVIRONMENT_ROOTS,
);

export const GEOMORPHOLOGICAL_ENVIRONMENT_HIERARCHY = {
  roots: GEOMORPHOLOGICAL_ENVIRONMENT_ROOTS,
  nodes: GEOMORPHOLOGICAL_ENVIRONMENT_TREE,
};

export const geomorphologicalEnvironmentSchema = z
  .string()
  .refine((path) => GEOMORPHOLOGICAL_ENVIRONMENTS.includes(path));
