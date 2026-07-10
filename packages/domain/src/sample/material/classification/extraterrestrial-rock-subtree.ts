import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `extraterrestrial_rock` root (screenshot "Extraterrestrial
// rocks classification"). Spread into the material tree in classification.ts.
// Every parent is mandatory (the default: no node is marked `optional: true`).
// Segments without an entry (micrometeorites, ungrouped, ryugu...) are
// childless leaves labelled by their own code (see tree-node.ts).
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
  // `rock` is the material root elsewhere; here it is a childless leaf, so
  // override it only in the lunar-sample context (longest-suffix match).
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
} satisfies Record<string, TreeNode>;
