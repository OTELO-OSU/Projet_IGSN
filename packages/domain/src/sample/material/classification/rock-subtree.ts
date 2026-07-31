import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `rock` root (MINDAT): igneous, metamorphic, the sedimentary
// subtree, hydrothermal, unknown.
export const rockTree = {
  igneous: {
    searchable: true,
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
  xenolithic_rock: { choices: ["igneous", "metamorphic"] },
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
  plutonic: {
    searchable: true,
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },
  volcanic: {
    searchable: true,
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },

  "plutonic.felsic": {
    editableChildren: true,
    label: "felsic",
    searchable: true,
    choices: ["granite", "granodiorite", "tonalite", "trondhjemite"],
  },
  "plutonic.intermediate": {
    editableChildren: true,
    label: "intermediate",
    searchable: true,
    choices: ["syenite", "monzonite", "diorite"],
  },
  "plutonic.mafic": {
    editableChildren: true,
    label: "mafic",
    searchable: true,
    choices: ["gabbro", "norite", "anorthosite", "troctolite"],
  },
  "plutonic.ultramafic": {
    editableChildren: true,
    label: "ultramafic",
    searchable: true,
    choices: ["peridotite", "pyroxenite", "hornblendite"],
  },
  "plutonic.exotic": {
    editableChildren: true,
    label: "exotic",
    searchable: true,
    choices: ["carbonatite", "hyperalkaline_rocks"],
  },

  "volcanic.felsic": {
    editableChildren: true,
    label: "felsic",
    searchable: true,
    choices: ["rhyolite", "dacite"],
  },
  "volcanic.intermediate": {
    editableChildren: true,
    label: "intermediate",
    searchable: true,
    choices: ["trachyte", "latite", "andesite", "phonolite"],
  },
  "volcanic.mafic": {
    editableChildren: true,
    label: "mafic",
    searchable: true,
    choices: ["basalt", "basanite", "tephrite"],
  },
  "volcanic.ultramafic": {
    editableChildren: true,
    label: "ultramafic",
    searchable: true,
    choices: ["komatiite", "picrite"],
  },
  "volcanic.exotic": {
    editableChildren: true,
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

  // Sedimentary-rock subtree. Its marks follow the source list 1:1, including
  // nodes under an already-marked ancestor that frozenMaterialPrefix never
  // reads (see sediment-subtree.ts).
  clastic_sedimentary_rock: {
    editableChildren: true,
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
    editableChildren: true,
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
    editableChildren: true,
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
    editableChildren: true,
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
    editableChildren: true,
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
    editableChildren: true,
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
    editableChildren: true,
    choices: ["coal", "asphaltite", "sapropelite", "other"],
  },

  siliceous_rock: {
    editableChildren: true,
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
