import { type TreeNode } from "../../path/tree-node.ts";
import { editableLeaves } from "./editable-leaves.ts";

// Descendants of the `sediment` root (screenshot "Sediment classification").
// Every inner box is pink (mandatory, the default: no node is marked
// `optional: true`). A published sediment is frozen down to its second level
// only (ADR 0022), so its third level carries `frozenWhenPublished: false` and
// nothing deeper needs a mark.
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
    frozenWhenPublished: false,
    choices: ["boulder", "cobble", "pebble", "granule"],
  },

  // Grain-size classes are distinct codes per host (a sand grade is not a silt
  // grade); labels are the size word alone.
  sand: {
    frozenWhenPublished: false,
    choices: [
      "very_coarse_sand",
      "coarse_sand",
      "medium_sand",
      "fine_sand",
      "very_fine_sand",
    ],
  },

  silt: {
    frozenWhenPublished: false,
    choices: [
      "very_coarse_silt",
      "coarse_silt",
      "medium_silt",
      "fine_silt",
      "very_fine_silt",
    ],
  },

  ...editableLeaves("clay"),

  heterogeneous: {
    frozenWhenPublished: false,
    choices: ["diamicton", "other"],
  },

  bomb: {
    frozenWhenPublished: false,
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },
  lapilli: {
    frozenWhenPublished: false,
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },
  ash: {
    frozenWhenPublished: false,
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
  },

  carbonate: {
    frozenWhenPublished: false,
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
    frozenWhenPublished: false,
    choices: ["diatoms", "radiolarians", "sponges"],
  },

  organic_rich: {
    frozenWhenPublished: false,
    choices: ["peat", "coal", "algal_rich", "organic_mud", "other"],
  },

  bioprecipitated: {
    frozenWhenPublished: false,
    choices: ["microbialites", "organic_decay_induced"],
  },

  precipitates: {
    frozenWhenPublished: false,
    choices: ["evaporitic", "metalliferous", "carbonated", "phosphated"],
  },

  alteration_residual_products: {
    frozenWhenPublished: false,
    choices: ["regoliths", "altered_clays"],
  },
} satisfies Record<string, TreeNode>;
