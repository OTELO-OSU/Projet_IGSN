import { type TreeNode } from "../../path/tree-node.ts";

const frozenLeaves = <C extends string>(...codes: C[]): Record<C, TreeNode> =>
  Object.fromEntries(
    codes.map((code) => [code, { frozenWhenPublished: true }]),
  ) as Record<C, TreeNode>;

// Descendants of the `extraterrestrial_rock` root (screenshot "Extraterrestrial
// rocks classification"). Spread into the material tree in classification.ts.
// Every parent is mandatory (the default: no node is marked `optional: true`).
// Nothing here may change once published (ADR 0022), so every node is marked,
// leaves included: they need an entry only for that flag.
export const extraterrestrialRockTree = {
  returned_samples: {
    frozenWhenPublished: true,
    choices: ["lunar_sample", "asteroid", "other"],
  },
  meteorites: {
    frozenWhenPublished: true,
    choices: ["chondrites", "achondrite_primitive", "achondrites"],
  },
  ...frozenLeaves("micrometeorites"),

  lunar_sample: {
    frozenWhenPublished: true,
    choices: ["rock", "soil", "core"],
  },
  // `rock` is the material root elsewhere; here it is a childless leaf, so
  // override it only in the lunar-sample context (longest-suffix match).
  "lunar_sample.rock": { frozenWhenPublished: true, label: "rock" },
  ...frozenLeaves("soil", "core"),

  asteroid: {
    frozenWhenPublished: true,
    choices: ["itokawa", "ryugu", "bennu", "other"],
  },
  ...frozenLeaves("itokawa", "ryugu", "bennu"),

  chondrites: {
    frozenWhenPublished: true,
    choices: [
      "carbonaceous_chondrites",
      "ordinary_chondrites",
      "enstatite_chondrites",
      "rumuruti_chondrites",
      "kakangarites",
      "ungrouped",
    ],
  },
  ...frozenLeaves("rumuruti_chondrites", "kakangarites"),

  carbonaceous_chondrites: {
    frozenWhenPublished: true,
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
  ...frozenLeaves(
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
  ),

  ordinary_chondrites: {
    frozenWhenPublished: true,
    choices: ["h", "l", "ll", "h_l", "l_ll", "ungrouped"],
  },
  ...frozenLeaves("h", "l", "ll", "h_l", "l_ll"),

  enstatite_chondrites: {
    frozenWhenPublished: true,
    choices: ["eh", "eha", "ehb", "el", "ela", "elb"],
  },
  ...frozenLeaves("eh", "eha", "ehb", "el", "ela", "elb"),

  achondrite_primitive: {
    frozenWhenPublished: true,
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
  ...frozenLeaves(
    "lodranite",
    "acapulcoite",
    "brachinite",
    "ureilite",
    "polymict_ureilite",
    "winonaite",
  ),

  achondrites: {
    frozenWhenPublished: true,
    choices: ["stony_achondrite", "iron_meteorite", "stony_iron_meteorite"],
  },
  stony_achondrite: {
    frozenWhenPublished: true,
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
  ...frozenLeaves("enstatite_achondrite", "angrite", "aubrite"),

  martian_meteorite: {
    frozenWhenPublished: true,
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
  ...frozenLeaves(
    "nakhlite",
    "shergottite",
    "chassignite",
    "orthopyroxenite",
    "augite_basalt",
    "polymict_breccia",
    "vesicular_basalt",
  ),

  lunar_meteorite: {
    frozenWhenPublished: true,
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
  ...frozenLeaves(
    "basaltic_breccia",
    "basaltic_gabbroic_breccia",
    "feldspathic_breccia",
    "feldspathic_melt_breccia",
    "fragmental_breccia",
    "melt_breccia",
    "olivine_gabbro",
    "olivine_gabbronorite",
    "troctolite_anorthosite",
    "troctolite_anorthosite_melt_breccia",
    "troctolite_melt_breccia",
    "troctolite_melt_rock",
  ),

  hed: {
    frozenWhenPublished: true,
    choices: ["howardite", "eucrite", "diogenite"],
  },
  ...frozenLeaves("howardite", "eucrite", "diogenite"),

  iron_meteorite: {
    frozenWhenPublished: true,
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
  ...frozenLeaves(
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
  ),
  iab: {
    frozenWhenPublished: true,
    choices: ["main_group", "shl", "shh", "sll", "ungrouped"],
  },
  ...frozenLeaves("shl", "shh", "sll"),

  stony_iron_meteorite: {
    frozenWhenPublished: true,
    choices: ["mesosiderite", "pallasite"],
  },
  pallasite: {
    frozenWhenPublished: true,
    choices: ["main_group", "eagle_station_group", "ungrouped"],
  },
  ...frozenLeaves("mesosiderite", "eagle_station_group"),

  ...frozenLeaves("ungrouped", "main_group"),

  // These codes name an editable level elsewhere in the tree (`basalt` is an
  // igneous leaf, `other` a leaf of editable branches), so they are frozen in
  // this context only (longest-suffix match).
  "returned_samples.other": { frozenWhenPublished: true, label: "other" },
  "asteroid.other": { frozenWhenPublished: true, label: "other" },
  "martian_meteorite.other": { frozenWhenPublished: true, label: "other" },
  "lunar_meteorite.anorthosite": {
    frozenWhenPublished: true,
    label: "anorthosite",
  },
  "lunar_meteorite.basalt": { frozenWhenPublished: true, label: "basalt" },
  "lunar_meteorite.gabbro": { frozenWhenPublished: true, label: "gabbro" },
  "lunar_meteorite.norite": { frozenWhenPublished: true, label: "norite" },
  "lunar_meteorite.troctolite": {
    frozenWhenPublished: true,
    label: "troctolite",
  },
  "lunar_meteorite.other": { frozenWhenPublished: true, label: "other" },
} satisfies Record<string, TreeNode>;
