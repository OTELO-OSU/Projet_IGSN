import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `sediment` root (screenshot "Sediment classification").
// Every inner box is pink (mandatory, the default: no node is marked
// `optional: true`). Every node the source list names is marked, including
// those under an already-marked ancestor that frozenMaterialPrefix never reads
// (it takes the shallowest), so the tree stays a 1:1 transcription of that
// list.
export const sedimentTree = {
  exogenous_detritic: {
    editableChildren: true,
    choices: ["gravel", "sand", "silt", "clay", "heterogeneous"],
  },
  volcano_detritic: {
    editableChildren: true,
    choices: ["bomb", "lapilli", "ash"],
  },
  biogenic: {
    editableChildren: true,
    choices: ["carbonate", "siliceous", "organic_rich", "bioprecipitated"],
  },
  physico_chemical: {
    editableChildren: true,
    choices: ["precipitates", "alteration_residual_products"],
  },

  gravel: {
    editableChildren: true,
    choices: ["boulder", "cobble", "pebble", "granule"],
  },

  // Grain-size classes are distinct codes per host (a sand grade is not a silt
  // grade); labels are the size word alone.
  sand: {
    editableChildren: true,
    choices: [
      "very_coarse_sand",
      "coarse_sand",
      "medium_sand",
      "fine_sand",
      "very_fine_sand",
    ],
  },

  silt: {
    editableChildren: true,
    choices: [
      "very_coarse_silt",
      "coarse_silt",
      "medium_silt",
      "fine_silt",
      "very_fine_silt",
    ],
  },

  heterogeneous: {
    editableChildren: true,
    choices: ["diamicton", "other"],
  },

  bomb: {
    editableChildren: true,
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },
  lapilli: {
    editableChildren: true,
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },
  ash: {
    editableChildren: true,
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },

  carbonate: {
    editableChildren: true,
    choices: ["grain_supported", "mud_supported", "boundstone"],
  },
  grain_supported: {
    editableChildren: true,
    choices: ["rudstone", "grainstone", "packstone"],
  },
  mud_supported: {
    editableChildren: true,
    choices: ["floatstone", "wackestone", "mudstone"],
  },
  // `boundstone` is a childless leaf elsewhere; here it needs textural children,
  // so override it only in the carbonate context (longest-suffix match).
  "carbonate.boundstone": {
    editableChildren: true,
    label: "boundstone",
    choices: ["frame", "baffle", "bind"],
  },

  siliceous: {
    editableChildren: true,
    choices: ["diatoms", "radiolarians", "sponges"],
  },

  organic_rich: {
    editableChildren: true,
    choices: ["peat", "coal", "algal_rich", "organic_mud", "other"],
  },

  bioprecipitated: {
    editableChildren: true,
    choices: ["microbialites", "organic_decay_induced"],
  },

  precipitates: {
    editableChildren: true,
    choices: ["evaporitic", "metalliferous", "carbonated", "phosphated"],
  },

  alteration_residual_products: {
    editableChildren: true,
    choices: ["regoliths", "altered_clays"],
  },
} satisfies Record<string, TreeNode>;
