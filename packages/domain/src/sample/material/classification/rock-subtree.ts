import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `rock` root (MINDAT): igneous, metamorphic, the sedimentary
// subtree, hydrothermal, unknown.
export const rockTree = {
  igneous: {
    frozenWhenPublished: true,
    searchable: true,
    choices: ["plutonic", "volcanic"],
  },
  metamorphic: {
    frozenWhenPublished: true,
    choices: ["weakly_metamorphosed", "strongly_metamorphosed"],
  },
  hydrothermal: {
    frozenWhenPublished: true,
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
  "hydrothermal.carbonate": { frozenWhenPublished: true, label: "carbonate" },
  breccia: { frozenWhenPublished: true },
  oxide: { frozenWhenPublished: true },
  stockwork: { frozenWhenPublished: true },
  sulfate: { frozenWhenPublished: true },
  sulfide: { frozenWhenPublished: true },

  xenolithic_rock: {
    frozenWhenPublished: true,
    choices: ["igneous", "metamorphic"],
  },
  unknown: { frozenWhenPublished: true },

  sedimentary: {
    frozenWhenPublished: true,
    choices: [
      "microbialite",
      "clastic_sedimentary_rock",
      "biochemical_and_chemical_sedimentary_rock",
      "volcaniclastic_rock",
      "hybrid_sedimentary_rock",
    ],
  },
  microbialite: { frozenWhenPublished: true },
  volcaniclastic_rock: { frozenWhenPublished: true },
  hybrid_sedimentary_rock: { frozenWhenPublished: true },

  // Igneous subtree (screenshot): plutonic/volcanic (Niv.2), then chemistry
  // (Niv.3, shared codes), then specific rocks (Niv.4). Each chemistry code
  // recurs under both branches with different children, so a dotted
  // `plutonic.*` / `volcanic.*` override carries that branch's choices.
  plutonic: {
    frozenWhenPublished: true,
    searchable: true,
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },
  volcanic: {
    frozenWhenPublished: true,
    searchable: true,
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },

  "plutonic.felsic": {
    frozenWhenPublished: true,
    label: "felsic",
    searchable: true,
    choices: ["granite", "granodiorite", "tonalite", "trondhjemite"],
  },
  "plutonic.intermediate": {
    frozenWhenPublished: true,
    label: "intermediate",
    searchable: true,
    choices: ["syenite", "monzonite", "diorite"],
  },
  "plutonic.mafic": {
    frozenWhenPublished: true,
    label: "mafic",
    searchable: true,
    choices: ["gabbro", "norite", "anorthosite", "troctolite"],
  },
  "plutonic.ultramafic": {
    frozenWhenPublished: true,
    label: "ultramafic",
    searchable: true,
    choices: ["peridotite", "pyroxenite", "hornblendite"],
  },
  "plutonic.exotic": {
    frozenWhenPublished: true,
    label: "exotic",
    searchable: true,
    choices: ["carbonatite", "hyperalkaline_rocks"],
  },

  "volcanic.felsic": {
    frozenWhenPublished: true,
    label: "felsic",
    searchable: true,
    choices: ["rhyolite", "dacite"],
  },
  "volcanic.intermediate": {
    frozenWhenPublished: true,
    label: "intermediate",
    searchable: true,
    choices: ["trachyte", "latite", "andesite", "phonolite"],
  },
  "volcanic.mafic": {
    frozenWhenPublished: true,
    label: "mafic",
    searchable: true,
    choices: ["basalt", "basanite", "tephrite"],
  },
  "volcanic.ultramafic": {
    frozenWhenPublished: true,
    label: "ultramafic",
    searchable: true,
    choices: ["komatiite", "picrite"],
  },
  "volcanic.exotic": {
    frozenWhenPublished: true,
    label: "exotic",
    searchable: true,
    choices: [
      "carbonatite",
      "foidite",
      "kimberlite",
      "lamprophyre",
      "hyperalkaline_rocks",
    ],
  },

  // Sedimentary-rock subtree. The freeze stops at these types: the rock names
  // below them stay choosable after publication, so they carry no flag.
  clastic_sedimentary_rock: {
    frozenWhenPublished: true,
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
    frozenWhenPublished: true,
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
