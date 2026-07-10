import { type TreeNode } from "../../path/tree-node.ts";

// Descendants of the `extraterrestrial_rock` root (screenshot "Extraterrestrial
// rocks classification"). Spread into the material tree in classification.ts.
// Every parent is mandatory (the default: no node is marked `optional: true`);
// leaves are valid stops. The shared `other` leaf lives in classification.ts;
// `ungrouped` is this subtree's own shared leaf, reused under several parents
// (the full path is the identity, ADR 0010).
export const extraterrestrialRockTree = {
  returned_samples: {
    label: "returned_samples",
    choices: ["lunar_sample", "asteroid", "other"],
  },
  meteorites: {
    label: "meteorites",
    choices: ["chondrites", "achondrite_primitive", "achondrites"],
  },
  micrometeorites: { label: "micrometeorites" },
  ungrouped: { label: "ungrouped" },

  lunar_sample: {
    label: "lunar_sample",
    choices: ["rock", "soil", "core"],
  },
  // `rock` is the material root elsewhere; here it is a childless leaf, so
  // override it only in the lunar-sample context (longest-suffix match).
  "lunar_sample.rock": { label: "rock" },
  soil: { label: "soil" },
  core: { label: "core" },

  asteroid: {
    label: "asteroid",
    choices: ["itokawa", "ryugu", "bennu", "other"],
  },
  itokawa: { label: "itokawa" },
  ryugu: { label: "ryugu" },
  bennu: { label: "bennu" },

  chondrites: {
    label: "chondrites",
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
    label: "carbonaceous_chondrites",
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
  ci: { label: "ci" },
  cm: { label: "cm" },
  co: { label: "co" },
  cv: { label: "cv" },
  cvox: { label: "cvox" },
  cvred: { label: "cvred" },
  ch: { label: "ch" },
  cb: { label: "cb" },
  cba: { label: "cba" },
  cbb: { label: "cbb" },
  cl: { label: "cl" },
  ck: { label: "ck" },
  cr: { label: "cr" },

  ordinary_chondrites: {
    label: "ordinary_chondrites",
    choices: ["h", "l", "ll", "h_l", "l_ll", "ungrouped"],
  },
  h: { label: "h" },
  l: { label: "l" },
  ll: { label: "ll" },
  h_l: { label: "h_l" },
  l_ll: { label: "l_ll" },

  enstatite_chondrites: {
    label: "enstatite_chondrites",
    choices: ["eh", "eha", "ehb", "el", "ela", "elb"],
  },
  eh: { label: "eh" },
  eha: { label: "eha" },
  ehb: { label: "ehb" },
  el: { label: "el" },
  ela: { label: "ela" },
  elb: { label: "elb" },

  rumuruti_chondrites: { label: "rumuruti_chondrites" },
  kakangarites: { label: "kakangarites" },

  achondrite_primitive: {
    label: "achondrite_primitive",
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
  lodranite: { label: "lodranite" },
  acapulcoite: { label: "acapulcoite" },
  brachinite: { label: "brachinite" },
  ureilite: { label: "ureilite" },
  polymict_ureilite: { label: "polymict_ureilite" },
  winonaite: { label: "winonaite" },

  achondrites: {
    label: "achondrites",
    choices: ["stony_achondrite", "iron_meteorite", "stony_iron_meteorite"],
  },
  stony_achondrite: {
    label: "stony_achondrite",
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
  enstatite_achondrite: { label: "enstatite_achondrite" },
  angrite: { label: "angrite" },
  aubrite: { label: "aubrite" },

  martian_meteorite: {
    label: "martian_meteorite",
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
  nakhlite: { label: "nakhlite" },
  shergottite: { label: "shergottite" },
  chassignite: { label: "chassignite" },
  orthopyroxenite: { label: "orthopyroxenite" },
  augite_basalt: { label: "augite_basalt" },
  polymict_breccia: { label: "polymict_breccia" },
  vesicular_basalt: { label: "vesicular_basalt" },

  lunar_meteorite: {
    label: "lunar_meteorite",
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
  // anorthosite, basalt, gabbro, norite and troctolite are shared with the
  // igneous rock subtree; they live once in classification.ts (like `other`).
  basaltic_breccia: { label: "basaltic_breccia" },
  basaltic_gabbroic_breccia: { label: "basaltic_gabbroic_breccia" },
  feldspathic_breccia: { label: "feldspathic_breccia" },
  feldspathic_melt_breccia: { label: "feldspathic_melt_breccia" },
  fragmental_breccia: { label: "fragmental_breccia" },
  melt_breccia: { label: "melt_breccia" },
  olivine_gabbro: { label: "olivine_gabbro" },
  olivine_gabbronorite: { label: "olivine_gabbronorite" },
  troctolite_anorthosite: { label: "troctolite_anorthosite" },
  troctolite_anorthosite_melt_breccia: {
    label: "troctolite_anorthosite_melt_breccia",
  },
  troctolite_melt_breccia: { label: "troctolite_melt_breccia" },
  troctolite_melt_rock: { label: "troctolite_melt_rock" },

  hed: {
    label: "hed",
    choices: ["howardite", "eucrite", "diogenite"],
  },
  howardite: { label: "howardite" },
  eucrite: { label: "eucrite" },
  diogenite: { label: "diogenite" },

  iron_meteorite: {
    label: "iron_meteorite",
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
    label: "iab",
    choices: ["main_group", "shl", "shh", "sll", "ungrouped"],
  },
  main_group: { label: "main_group" },
  shl: { label: "shl" },
  shh: { label: "shh" },
  sll: { label: "sll" },
  ic: { label: "ic" },
  iiab: { label: "iiab" },
  iic: { label: "iic" },
  iid: { label: "iid" },
  iie: { label: "iie" },
  iif: { label: "iif" },
  iig: { label: "iig" },
  iiiab: { label: "iiiab" },
  iiie: { label: "iiie" },
  iiif: { label: "iiif" },
  iva: { label: "iva" },
  ivb: { label: "ivb" },

  stony_iron_meteorite: {
    label: "stony_iron_meteorite",
    choices: ["mesosiderite", "pallasite"],
  },
  mesosiderite: { label: "mesosiderite" },
  pallasite: {
    label: "pallasite",
    choices: ["main_group", "eagle_station_group", "ungrouped"],
  },
  eagle_station_group: { label: "eagle_station_group" },
} satisfies Record<string, TreeNode>;
