import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `sediment` root (screenshot "Sediment classification").
// Spread into the material tree in classification.ts. Every inner box is pink
// (mandatory, the default: no node is marked `optional: true`). Segments
// without an entry (clay, boulder, pumices...) are childless leaves labelled by
// their own code (see tree-node.ts).
export const sedimentTree = {
  exogenous_detritic: {
    choices: ["gravel", "sand", "silt", "clay", "heterogeneous"],
  },
  volcano_detritic: {
    choices: ["bomb", "lapilli", "ash"],
  },
  biogenic: {
    choices: ["carbonate", "siliceous", "organic_rich", "bioprecipitated"],
  },
  physico_chemical: {
    choices: ["precipitates", "alteration_residual_products"],
  },

  gravel: {
    choices: ["boulder", "cobble", "pebble", "granule"],
  },

  // Grain-size classes are distinct codes per host (a sand grade is not a silt
  // grade); labels are the size word alone.
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

  // Bomb, Lapilli and Ash share the same four constituents.
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
  // `boundstone` is a childless leaf elsewhere; here it needs textural children,
  // so override it only in the carbonate context (longest-suffix match).
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
