import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `rock` root (MINDAT): igneous, metamorphic, the sedimentary
// subtree, hydrothermal, unknown. Spread into the material tree in
// classification.ts. Segments without an entry (metamorphic, granite...) are
// childless leaves labelled by their own code (see tree-node.ts).
export const rockTree = {
  igneous: {
    choices: ["plutonic", "volcanic"],
  },
  metamorphic: { choices: ["weakly_metamorphosed", "strongly_metamorphosed"] },
  hydrothermal: {
    choices: [
      "breccia",
      "carbonate",
      "oxide",
      "stockwork",
      "sulfate",
      "sulfide",
    ],
  },
  // `carbonate` is an inner node in the sediment subtree; here it is a plain
  // leaf, so a dotted override stops the walk (longest-suffix match).
  "hydrothermal.carbonate": { label: "carbonate" },
  sedimentary: {
    choices: [
      "microbialite",
      "clastic_sedimentary_rock",
      "biochemical_and_chemical_sedimentary_rock",
      "volcaniclastic_rock",
      "hybrid_sedimentary_rock",
    ],
  },

  // Igneous subtree (screenshot): plutonic/volcanic (Niv.2), then chemistry
  // (Niv.3, shared codes), then specific rocks (Niv.4). Each chemistry code
  // recurs under both branches with different children, so a dotted
  // `plutonic.*` / `volcanic.*` override carries that branch's choices.
  // `carbonatite` and `hyperalkaline_rocks` are shared leaves of both `exotic`
  // branches (path is identity). Every level is mandatory down to a rock leaf
  // (the default: nothing is marked `optional: true`).
  plutonic: {
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },
  volcanic: {
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },

  "plutonic.felsic": {
    label: "felsic",
    choices: ["granite", "granodiorite", "tonalite", "trondhjemite"],
  },
  "plutonic.intermediate": {
    label: "intermediate",
    choices: ["syenite", "monzonite", "diorite"],
  },
  "plutonic.mafic": {
    label: "mafic",
    choices: ["gabbro", "norite", "anorthosite", "troctolite"],
  },
  "plutonic.ultramafic": {
    label: "ultramafic",
    choices: ["peridotite", "pyroxenite", "hornblendite"],
  },
  "plutonic.exotic": {
    label: "exotic",
    choices: ["carbonatite", "hyperalkaline_rocks"],
  },

  "volcanic.felsic": {
    label: "felsic",
    choices: ["rhyolite", "dacite"],
  },
  "volcanic.intermediate": {
    label: "intermediate",
    choices: ["trachyte", "latite", "andesite", "phonolite"],
  },
  "volcanic.mafic": {
    label: "mafic",
    choices: ["basalt", "basanite", "tephrite"],
  },
  "volcanic.ultramafic": {
    label: "ultramafic",
    choices: ["komatiite", "picrite"],
  },
  "volcanic.exotic": {
    label: "exotic",
    choices: [
      "carbonatite",
      "foidite",
      "kimberlite",
      "lamprophyre",
      "hyperalkaline_rocks",
    ],
  },

  clastic_sedimentary_rock: {
    choices: [
      "rudite",
      "olistostrome",
      "paraconglomerate",
      "siliciclastic_sedimentary_rock",
      "sandstone",
      "mudstone",
      "other",
    ],
  },

  biochemical_and_chemical_sedimentary_rock: {
    choices: [
      "concretion",
      "coprolite",
      "moronite",
      "oolite",
      "pisolite",
      "carbonate_rock",
      "evaporite",
      "phosphorite",
      "ironstone",
      "organic_rich_rock",
      "siliceous_rock",
      "grainstone",
      "wackestone",
      "packstone",
      "boundstone",
      "other",
    ],
  },

  carbonate_rock: {
    choices: [
      "limestone",
      "dolostone",
      "magnesite_stone",
      "na_carbonate_rock",
      "framestone",
      "pseudosparstone",
      "sparstone",
      "microsparstone",
      "microstone",
      "other",
    ],
  },

  evaporite: {
    choices: [
      "gypsum_stone",
      "anhydrite_stone",
      "gypsum_anhydrite_stone",
      "baryte_stone",
      "polyhalite_stone",
      "kierserite_stone",
      "kainite_stone",
      "halite_stone",
      "sylvite_stone",
      "carnallite_stone",
      "borax_stone",
      "kernite_stone",
      "ulexite_stone",
      "colemanite_stone",
      "other",
    ],
  },

  phosphorite: {
    choices: [
      "guano",
      "phosphate_mudstone",
      "phosphate_packstone",
      "phosphate_grainstone",
      "phosphate_boundstone",
      "ooid_phosphorite",
      "pisoid_phosphorite",
      "oncoid_phosphorite",
      "microoncoid_phosphorite",
      "peloid_phosphorite",
      "other",
    ],
  },

  ironstone: {
    choices: [
      "goethite_stone",
      "hematite_stone",
      "limonite_stone",
      "siderite_stone",
      "iron_mudstone",
      "iron_wackestone",
      "iron_packstone",
      "iron_grainstone",
      "iron_boundstone",
      "ooid_ironstone",
      "pisoid_ironstone",
      "oncoid_ironstone",
      "microoncoid_ironstone",
      "peloid_ironstone",
      "banded_iron_formation",
      "other",
    ],
  },

  organic_rich_rock: {
    choices: ["coal", "asphaltite", "sapropelite", "other"],
  },

  siliceous_rock: {
    choices: [
      "diatomite",
      "radiolarite",
      "spiculite",
      "sinter",
      "porcellanite",
      "chert",
      "other",
    ],
  },
} satisfies Record<string, TreeNode>;
