import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `sediment` root (screenshot "Sediment classification").
// Spread into the material tree in classification.ts. Every inner box is pink
// (mandatory, the default: no node is marked `optional: true`); leaves are
// valid stops. The shared `other` leaf lives in classification.ts (reused by
// rock too).
export const sedimentTree = {
  exogenous_detritic: {
    label: "exogenous_detritic",
    choices: ["gravel", "sand", "silt", "clay", "heterogeneous"],  },
  volcano_detritic: {
    label: "volcano_detritic",
    choices: ["bomb", "lapilli", "ash"],  },
  biogenic: {
    label: "biogenic",
    choices: ["carbonate", "siliceous", "organic_rich", "bioprecipitated"],  },
  physico_chemical: {
    label: "physico_chemical",
    choices: ["precipitates", "alteration_residual_products"],  },

  gravel: {
    label: "gravel",
    choices: ["boulder", "cobble", "pebble", "granule"],  },
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
    ],  },
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
    ],  },
  very_coarse_silt: { label: "very_coarse_silt" },
  coarse_silt: { label: "coarse_silt" },
  medium_silt: { label: "medium_silt" },
  fine_silt: { label: "fine_silt" },
  very_fine_silt: { label: "very_fine_silt" },

  clay: { label: "clay" },
  heterogeneous: {
    label: "heterogeneous",
    choices: ["diamicton", "other"],  },
  diamicton: { label: "diamicton" },

  // Bomb, Lapilli and Ash share the same four constituents.
  bomb: {
    label: "bomb",
    choices: ["pumices", "glass", "crystals", "rock_fragments"],  },
  lapilli: {
    label: "lapilli",
    choices: ["pumices", "glass", "crystals", "rock_fragments"],  },
  ash: {
    label: "ash",
    choices: ["pumices", "glass", "crystals", "rock_fragments"],  },
  pumices: { label: "pumices" },
  glass: { label: "glass" },
  crystals: { label: "crystals" },
  rock_fragments: { label: "rock_fragments" },

  carbonate: {
    label: "carbonate",
    choices: ["grain_supported", "mud_supported", "boundstone"],  },
  grain_supported: {
    label: "grain_supported",
    choices: ["rudstone", "grainstone", "packstone"],  },
  rudstone: { label: "rudstone" },
  mud_supported: {
    label: "mud_supported",
    choices: ["floatstone", "wackestone", "mudstone"],  },
  floatstone: { label: "floatstone" },
  // `boundstone` is a childless leaf elsewhere; here it needs textural children,
  // so override it only in the carbonate context (longest-suffix match).
  "carbonate.boundstone": {
    label: "boundstone",
    choices: ["frame", "baffle", "bind"],  },
  frame: { label: "frame" },
  baffle: { label: "baffle" },
  bind: { label: "bind" },

  siliceous: {
    label: "siliceous",
    choices: ["diatoms", "radiolarians", "sponges"],  },
  diatoms: { label: "diatoms" },
  radiolarians: { label: "radiolarians" },
  sponges: { label: "sponges" },

  organic_rich: {
    label: "organic_rich",
    choices: ["peat", "coal", "algal_rich", "organic_mud", "other"],  },
  peat: { label: "peat" },
  algal_rich: { label: "algal_rich" },
  organic_mud: { label: "organic_mud" },

  bioprecipitated: {
    label: "bioprecipitated",
    choices: ["microbialites", "organic_decay_induced"],  },
  microbialites: { label: "microbialites" },
  organic_decay_induced: { label: "organic_decay_induced" },

  precipitates: {
    label: "precipitates",
    choices: ["evaporitic", "metalliferous", "carbonated", "phosphated"],  },
  evaporitic: { label: "evaporitic" },
  metalliferous: { label: "metalliferous" },
  carbonated: { label: "carbonated" },
  phosphated: { label: "phosphated" },

  alteration_residual_products: {
    label: "alteration_residual_products",
    choices: ["regoliths", "altered_clays"],  },
  regoliths: { label: "regoliths" },
  altered_clays: { label: "altered_clays" },
} satisfies Record<string, TreeNode>;
