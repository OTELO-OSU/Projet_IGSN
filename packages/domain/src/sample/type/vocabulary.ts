import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

// Hierarchical sample-type vocabulary (ADR 0011), a segment-keyed tree like
// material (see classification.ts). Every level is mandatory (the default: no
// node is marked `optional: true`), so a type is complete only at a leaf (see
// isSampleTypeComplete).
//
// A choices entry or root must be a key of this tree; a mistyped literal trips
// the tree spec (vocabulary.spec.ts). `core` lists itself as a child (the
// historical `core.core` type); the dotted `core.core` key declares that
// occurrence a childless leaf, so expandPaths stops there (its longest-suffix
// resolution).
const typeTree = {
  core: {
    label: "core",
    choices: [
      "core",
      "half_round",
      "piece",
      "quarter_round",
      "section",
      "section_half",
      "sub_piece",
      "whole_round",
      "cuttings",
      "individual_sample",
      "individual_sample_in_core",
      "sample_from_a_cut",
      "catcher",
      "slab",
      "casq_section",
      "casq_section_large_lu_gutter",
      "casq_section_narrow_nu_gutter",
      "outcrop_preserved_stratigraphy",
    ],
  },
  // Childless override terminating core.core.
  "core.core": { label: "core" },
  half_round: { label: "half_round" },
  piece: { label: "piece" },
  quarter_round: { label: "quarter_round" },
  section: { label: "section" },
  section_half: { label: "section_half" },
  sub_piece: { label: "sub_piece" },
  whole_round: { label: "whole_round" },
  cuttings: { label: "cuttings" },
  individual_sample: { label: "individual_sample" },
  individual_sample_in_core: { label: "individual_sample_in_core" },
  sample_from_a_cut: { label: "sample_from_a_cut" },
  catcher: { label: "catcher" },
  slab: { label: "slab" },
  casq_section: { label: "casq_section" },
  casq_section_large_lu_gutter: { label: "casq_section_large_lu_gutter" },
  casq_section_narrow_nu_gutter: { label: "casq_section_narrow_nu_gutter" },
  outcrop_preserved_stratigraphy: { label: "outcrop_preserved_stratigraphy" },
  dredge: { label: "dredge" },
  serie_of_sample: { label: "serie_of_sample" },
  inapplicable: { label: "inapplicable" },
} satisfies Record<string, TreeNode>;

// Every tree key, including dotted path-section overrides like `core.core`.
export type SampleTypeKey = keyof typeof typeTree;

// Bare segment codes only; dotted override keys excluded, as labels key by segment.
export type SampleTypeSegment = Exclude<SampleTypeKey, `${string}.${string}`>;

// Widen values to TreeNode for uniform reads, keeping the literal keys.
export const SAMPLE_TYPE_TREE: Record<SampleTypeKey, TreeNode> = typeTree;

// Entry points. `individual_sample` is also a child of `core`, but since a path
// is the identity, listing it here is a distinct root.
export const SAMPLE_TYPE_ROOTS = [
  "core",
  "dredge",
  "individual_sample",
  "serie_of_sample",
  "inapplicable",
] as const satisfies readonly SampleTypeSegment[];

export const SAMPLE_TYPES = expandPaths(SAMPLE_TYPE_TREE, SAMPLE_TYPE_ROOTS);

// The vocabulary as one self-describing bundle for HierarchySelectField.
export const SAMPLE_TYPE_HIERARCHY = {
  roots: SAMPLE_TYPE_ROOTS,
  nodes: SAMPLE_TYPE_TREE,
};

// A validated dot-joined path. Not a literal union: the valid set is derived
// from the tree at runtime and enforced by the schema, not the type.
export type SampleType = string;

export const sampleTypeSchema = z
  .string()
  .refine((path): path is SampleType => SAMPLE_TYPES.includes(path));
