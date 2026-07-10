import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `sediment` root (screenshot "Sediment classification").
// Spread into the material tree in classification.ts. Every inner box is pink
// (mandatory), so parents carry `optional: false`; leaves are valid stops. The
// shared `other` leaf lives in classification.ts (reused by rock too).
export const sedimentTree = {
  exogenous_detritic: {
    label: "exogenous_detritic",
    choices: ["gravel", "sand", "silt", "clay", "heterogeneous"],
    optional: false,
  },
  volcano_detritic: {
    label: "volcano_detritic",
    choices: ["bomb", "lapilli", "ash"],
    optional: false,
  },
  biogenic: {
    label: "biogenic",
    choices: ["carbonate", "siliceous", "organic_rich", "bioprecipitated"],
    optional: false,
  },
  physico_chemical: {
    label: "physico_chemical",
    choices: ["precipitates", "alteration_residual_products"],
    optional: false,
  },

  gravel: {
    label: "gravel",
    choices: ["boulder", "cobble", "pebble", "granule"],
    optional: false,
  },
  boulder: { label: "boulder" },
  cobble: { label: "cobble" },
  pebble: { label: "pebble" },
  granule: { label: "granule" },

  // Grain-size classes are distinct codes per host (a sand grade is not a silt
  // grade); labels are the size word alone.
  sand: {
    label: "sand",
    choices: [
      "very_coarse_sand",
      "coarse_sand",
      "medium_sand",
      "fine_sand",
      "very_fine_sand",
    ],
    optional: false,
  },
  very_coarse_sand: { label: "very_coarse_sand" },
  coarse_sand: { label: "coarse_sand" },
  medium_sand: { label: "medium_sand" },
  fine_sand: { label: "fine_sand" },
  very_fine_sand: { label: "very_fine_sand" },

  silt: {
    label: "silt",
    choices: [
      "very_coarse_silt",
      "coarse_silt",
      "medium_silt",
      "fine_silt",
      "very_fine_silt",
    ],
    optional: false,
  },
  very_coarse_silt: { label: "very_coarse_silt" },
  coarse_silt: { label: "coarse_silt" },
  medium_silt: { label: "medium_silt" },
  fine_silt: { label: "fine_silt" },
  very_fine_silt: { label: "very_fine_silt" },

  clay: { label: "clay" },
  heterogeneous: {
    label: "heterogeneous",
    choices: ["diamicton", "other"],
    optional: false,
  },
  diamicton: { label: "diamicton" },

  // Bomb, Lapilli and Ash share the same four constituents.
  bomb: {
    label: "bomb",
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
    optional: false,
  },
  lapilli: {
    label: "lapilli",
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
    optional: false,
  },
  ash: {
    label: "ash",
    choices: ["pumices", "glass", "crystals", "rock_fragments"],
    optional: false,
  },
  pumices: { label: "pumices" },
  glass: { label: "glass" },
  crystals: { label: "crystals" },
  rock_fragments: { label: "rock_fragments" },

  carbonate: {
    label: "carbonate",
    choices: ["grain_supported", "mud_supported", "boundstone"],
    optional: false,
  },
  grain_supported: {
    label: "grain_supported",
    choices: ["rudstone", "grainstone", "packstone"],
    optional: false,
  },
  rudstone: { label: "rudstone" },
  mud_supported: {
    label: "mud_supported",
    choices: ["floatstone", "wackestone", "mudstone"],
    optional: false,
  },
  floatstone: { label: "floatstone" },
  // `boundstone` is a childless leaf elsewhere; here it needs textural children,
  // so override it only in the carbonate context (longest-suffix match).
  "carbonate.boundstone": {
    label: "boundstone",
    choices: ["frame", "baffle", "bind"],
    optional: false,
  },
  frame: { label: "frame" },
  baffle: { label: "baffle" },
  bind: { label: "bind" },

  siliceous: {
    label: "siliceous",
    choices: ["diatoms", "radiolarians", "sponges"],
    optional: false,
  },
  diatoms: { label: "diatoms" },
  radiolarians: { label: "radiolarians" },
  sponges: { label: "sponges" },

  organic_rich: {
    label: "organic_rich",
    choices: ["peat", "coal", "algal_rich", "organic_mud", "other"],
    optional: false,
  },
  peat: { label: "peat" },
  algal_rich: { label: "algal_rich" },
  organic_mud: { label: "organic_mud" },

  bioprecipitated: {
    label: "bioprecipitated",
    choices: ["microbialites", "organic_decay_induced"],
    optional: false,
  },
  microbialites: { label: "microbialites" },
  organic_decay_induced: { label: "organic_decay_induced" },

  precipitates: {
    label: "precipitates",
    choices: ["evaporitic", "metalliferous", "carbonated", "phosphated"],
    optional: false,
  },
  evaporitic: { label: "evaporitic" },
  metalliferous: { label: "metalliferous" },
  carbonated: { label: "carbonated" },
  phosphated: { label: "phosphated" },

  alteration_residual_products: {
    label: "alteration_residual_products",
    choices: ["regoliths", "altered_clays"],
    optional: false,
  },
  regoliths: { label: "regoliths" },
  altered_clays: { label: "altered_clays" },
} satisfies Record<string, TreeNode>;
