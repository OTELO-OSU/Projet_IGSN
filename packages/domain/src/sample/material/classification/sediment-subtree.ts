import { type TreeNode } from "../../path/tree-node.ts";

export const sedimentTree = {
  exogenous_detritic: {
    optional: true,
    frozenWhenPublished: false,
    choices: ["gravel", "sand", "silt", "clay", "heterogeneous"],
  },
  volcano_detritic: {
    optional: true,
    frozenWhenPublished: false,
    choices: ["bomb", "lapilli", "ash"],
  },
  biogenic: {
    optional: true,
    frozenWhenPublished: false,
    choices: ["carbonate", "siliceous", "organic_rich", "bioprecipitated"],
  },
  physico_chemical: {
    optional: true,
    frozenWhenPublished: false,
    choices: ["precipitates", "alteration_residual_products"],
  },

  gravel: {
    choices: ["boulder", "cobble", "pebble", "granule"],
  },

  sand: {
    choices: [
      "very_coarse_sand",
      "coarse_sand",
      "medium_sand",
      "fine_sand",
      "very_fine_sand",
    ],
  },

  silt: {
    choices: [
      "very_coarse_silt",
      "coarse_silt",
      "medium_silt",
      "fine_silt",
      "very_fine_silt",
    ],
  },

  heterogeneous: {
    choices: ["diamicton", "other"],
  },

  bomb: {
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },
  lapilli: {
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },
  ash: {
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },

  carbonate: {
    choices: ["grain_supported", "mud_supported", "boundstone"],
  },
  grain_supported: {
    choices: ["rudstone", "grainstone", "packstone"],
  },
  mud_supported: {
    choices: ["floatstone", "wackestone", "mudstone"],
  },
  "carbonate.boundstone": {
    label: "boundstone",
    choices: ["frame", "baffle", "bind"],
  },

  siliceous: {
    choices: ["diatoms", "radiolarians", "sponges"],
  },

  organic_rich: {
    choices: ["peat", "coal", "algal_rich", "organic_mud", "other"],
  },

  bioprecipitated: {
    choices: ["microbialites", "organic_decay_induced"],
  },

  precipitates: {
    choices: ["evaporitic", "metalliferous", "carbonated", "phosphated"],
  },

  alteration_residual_products: {
    choices: ["regoliths", "altered_clays"],
  },
} satisfies Record<string, TreeNode>;
