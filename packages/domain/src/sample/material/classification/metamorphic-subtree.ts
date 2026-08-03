import { type TreeNode } from "../../path/tree-node.ts";

// Metamorphic branch (screenshot): metamorphic -> weakly / strongly
// metamorphosed (the `metamorphic` node with these choices lives in
// rock-subtree.ts).
// Metamorphic facies is NOT here: it is a separate required sample field, not a
// material-tree branch (see metamorphic-facies/vocabulary).
//
// Weakly metamorphosed reuses the igneous (plutonic/volcanic) and sedimentary
// subtrees by referencing their nodes in `choices`: the full path is the
// identity (ADR 0010) and resolvePathNode matches by longest suffix, so the
// existing `plutonic.*`/`volcanic.*` and sedimentary overrides still apply under
// this branch. `hornblendite` and `pyroxenite` are igneous leaves reused as
// generic terms the same way (defined in rock-subtree.ts, referenced here).
// The reused subtrees keep their own freeze marks, so a weakly metamorphosed
// plutonic rock unlocks below the chemistry level, like an igneous one.
export const metamorphicTree = {
  weakly_metamorphosed: {
    frozenWhenPublished: true,
    choices: ["meta_igneous_rock", "meta_sedimentary_rock"],
  },
  meta_igneous_rock: {
    frozenWhenPublished: true,
    choices: ["plutonic", "volcanic"],
  },
  meta_sedimentary_rock: {
    frozenWhenPublished: true,
    choices: [
      "microbialite",
      "clastic_sedimentary_rock",
      "biochemical_and_chemical_sedimentary_rock",
      "volcaniclastic_rock",
      "hybrid_sedimentary_rock",
    ],
  },

  strongly_metamorphosed: {
    frozenWhenPublished: true,
    choices: [
      "amphibolite",
      "anthracite_coal",
      "buchite",
      "calc_silicate_rock",
      "carbonate_silicate_rock",
      "charnockite",
      "eclogite",
      "emery_rock",
      "enderbite",
      "felsic_granulite",
      "glaucophanite",
      "gneiss",
      "granofels",
      "granulite",
      "greenschist",
      "hornblendite",
      "hornfels",
      "impactite",
      "itabirite",
      "itacolumite",
      "mafic_granulite",
      "marble",
      "mica_schist",
      "migmatite",
      "mylonite",
      "ophicalcite",
      "ophiocarbonate",
      "phyllite",
      "pyroxenite",
      "quartzite",
      "rodingite",
      "schist",
      "serpentinite",
      "skarn",
      "slate",
      "spilite",
    ],
  },
} satisfies Record<string, TreeNode>;
