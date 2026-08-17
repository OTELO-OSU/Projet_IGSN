import { type TreeNode } from "../../path/tree-node.ts";
import { editableLeaves } from "./editable-leaves.ts";

export const rockTree = {
  igneous: {
    searchable: true,
    choices: ["plutonic", "volcanic"],
  },
  metamorphic: {
    choices: ["weakly_metamorphosed", "strongly_metamorphosed"],
  },
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
  "hydrothermal.carbonate": { label: "carbonate" },

  xenolithic_rock: {
    choices: ["igneous", "metamorphic"],
  },

  sedimentary: {
    choices: [
      "microbialite",
      "clastic_sedimentary_rock",
      "biochemical_and_chemical_sedimentary_rock",
      "volcaniclastic_rock",
      "hybrid_sedimentary_rock",
    ],
  },

  plutonic: {
    searchable: true,
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },
  volcanic: {
    searchable: true,
    choices: ["felsic", "intermediate", "mafic", "ultramafic", "exotic"],
  },

  "plutonic.felsic": {
    label: "felsic",
    searchable: true,
    choices: ["granite", "granodiorite", "tonalite", "trondhjemite"],
  },
  "plutonic.intermediate": {
    label: "intermediate",
    searchable: true,
    choices: ["syenite", "monzonite", "diorite"],
  },
  "plutonic.mafic": {
    label: "mafic",
    searchable: true,
    choices: ["gabbro", "norite", "anorthosite", "troctolite"],
  },
  "plutonic.ultramafic": {
    label: "ultramafic",
    searchable: true,
    choices: ["peridotite", "pyroxenite", "hornblendite"],
  },
  "plutonic.exotic": {
    label: "exotic",
    searchable: true,
    choices: ["carbonatite", "hyperalkaline_rocks"],
  },

  "volcanic.felsic": {
    label: "felsic",
    searchable: true,
    choices: ["rhyolite", "dacite"],
  },
  "volcanic.intermediate": {
    label: "intermediate",
    searchable: true,
    choices: ["trachyte", "latite", "andesite", "phonolite"],
  },
  "volcanic.mafic": {
    label: "mafic",
    searchable: true,
    choices: ["basalt", "basanite", "tephrite"],
  },
  "volcanic.ultramafic": {
    label: "ultramafic",
    searchable: true,
    choices: ["komatiite", "picrite"],
  },
  "volcanic.exotic": {
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

  ...editableLeaves(
    "granite",
    "granodiorite",
    "tonalite",
    "trondhjemite",
    "syenite",
    "monzonite",
    "diorite",
    "gabbro",
    "norite",
    "anorthosite",
    "troctolite",
    "peridotite",
    "pyroxenite",
    "hornblendite",
    "carbonatite",
    "hyperalkaline_rocks",
    "rhyolite",
    "dacite",
    "trachyte",
    "latite",
    "andesite",
    "phonolite",
    "basalt",
    "basanite",
    "tephrite",
    "komatiite",
    "picrite",
    "foidite",
    "kimberlite",
    "lamprophyre",
  ),

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
  ...editableLeaves(
    "rudite",
    "olistostrome",
    "paraconglomerate",
    "siliciclastic_sedimentary_rock",
    "sandstone",
    "mudstone",
    "other",
  ),

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
  ...editableLeaves(
    "concretion",
    "coprolite",
    "moronite",
    "oolite",
    "pisolite",
    "grainstone",
    "wackestone",
    "packstone",
    "boundstone",
  ),

  carbonate_rock: {
    frozenWhenPublished: false,
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
    frozenWhenPublished: false,
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
    frozenWhenPublished: false,
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
    frozenWhenPublished: false,
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
    frozenWhenPublished: false,
    choices: ["coal", "asphaltite", "sapropelite", "other"],
  },

  siliceous_rock: {
    frozenWhenPublished: false,
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
