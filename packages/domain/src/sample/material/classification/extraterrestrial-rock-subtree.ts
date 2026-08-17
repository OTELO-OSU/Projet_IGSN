import { type TreeNode } from "../../path/tree-node.ts";

export const extraterrestrialRockTree = {
  returned_samples: {
    choices: ["lunar_sample", "asteroid", "other"],
  },
  meteorites: {
    choices: ["chondrites", "achondrite_primitive", "achondrites"],
  },

  lunar_sample: {
    choices: ["rock", "soil", "core"],
  },
  "lunar_sample.rock": { label: "rock" },

  asteroid: {
    choices: ["itokawa", "ryugu", "bennu", "other"],
  },

  chondrites: {
    choices: [
      "carbonaceous_chondrites",
      "ordinary_chondrites",
      "enstatite_chondrites",
      "rumuruti_chondrites",
      "kakangarites",
      "ungrouped",
    ],
  },

  carbonaceous_chondrites: {
    choices: [
      "ci",
      "cm",
      "co",
      "cv",
      "cvox",
      "cvred",
      "ch",
      "cb",
      "cba",
      "cbb",
      "cl",
      "ck",
      "cr",
      "ungrouped",
    ],
  },

  ordinary_chondrites: {
    choices: ["h", "l", "ll", "h_l", "l_ll", "ungrouped"],
  },

  enstatite_chondrites: {
    choices: ["eh", "eha", "ehb", "el", "ela", "elb"],
  },

  achondrite_primitive: {
    choices: [
      "lodranite",
      "acapulcoite",
      "brachinite",
      "ureilite",
      "polymict_ureilite",
      "winonaite",
      "ungrouped",
    ],
  },

  achondrites: {
    choices: ["stony_achondrite", "iron_meteorite", "stony_iron_meteorite"],
  },
  stony_achondrite: {
    choices: [
      "martian_meteorite",
      "lunar_meteorite",
      "hed",
      "enstatite_achondrite",
      "angrite",
      "aubrite",
      "ungrouped",
    ],
  },

  martian_meteorite: {
    choices: [
      "nakhlite",
      "shergottite",
      "chassignite",
      "orthopyroxenite",
      "augite_basalt",
      "polymict_breccia",
      "vesicular_basalt",
      "other",
    ],
  },

  lunar_meteorite: {
    choices: [
      "anorthosite",
      "basaltic_breccia",
      "basaltic_gabbroic_breccia",
      "basalt",
      "feldspathic_breccia",
      "feldspathic_melt_breccia",
      "fragmental_breccia",
      "gabbro",
      "melt_breccia",
      "norite",
      "olivine_gabbro",
      "olivine_gabbronorite",
      "troctolite_anorthosite",
      "troctolite_anorthosite_melt_breccia",
      "troctolite_melt_breccia",
      "troctolite_melt_rock",
      "troctolite",
      "other",
    ],
  },

  hed: {
    choices: ["howardite", "eucrite", "diogenite"],
  },

  iron_meteorite: {
    choices: [
      "iab",
      "ic",
      "iiab",
      "iic",
      "iid",
      "iie",
      "iif",
      "iig",
      "iiiab",
      "iiie",
      "iiif",
      "iva",
      "ivb",
      "ungrouped",
    ],
  },
  iab: {
    choices: ["main_group", "shl", "shh", "sll", "ungrouped"],
  },

  stony_iron_meteorite: {
    choices: ["mesosiderite", "pallasite"],
  },
  pallasite: {
    choices: ["main_group", "eagle_station_group", "ungrouped"],
  },

  "returned_samples.other": { label: "other" },
  "asteroid.other": { label: "other" },
  "martian_meteorite.other": { label: "other" },
  "lunar_meteorite.anorthosite": { label: "anorthosite" },
  "lunar_meteorite.basalt": { label: "basalt" },
  "lunar_meteorite.gabbro": { label: "gabbro" },
  "lunar_meteorite.norite": { label: "norite" },
  "lunar_meteorite.troctolite": { label: "troctolite" },
  "lunar_meteorite.other": { label: "other" },
} satisfies Record<string, TreeNode>;
