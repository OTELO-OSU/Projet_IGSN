import { z } from "zod";

import { expandPaths } from "../path/expand-paths.ts";
import { type TreeNode } from "../path/tree-node.ts";

const typeTree = {
  core: {
    searchable: true,
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
  "core.core": { label: "core", searchable: true },
  dredge: { searchable: true },
  serie_of_sample: { searchable: true },
  inapplicable: { searchable: true },
  individual_sample: { searchable: true },
  half_round: { searchable: true },
  piece: { searchable: true },
  quarter_round: { searchable: true },
  section: { searchable: true },
  section_half: { searchable: true },
  sub_piece: { searchable: true },
  whole_round: { searchable: true },
  cuttings: { searchable: true },
  individual_sample_in_core: { searchable: true },
  sample_from_a_cut: { searchable: true },
  catcher: { searchable: true },
  slab: { searchable: true },
  casq_section: { searchable: true },
  casq_section_large_lu_gutter: { searchable: true },
  casq_section_narrow_nu_gutter: { searchable: true },
  outcrop_preserved_stratigraphy: { searchable: true },
} satisfies Record<string, TreeNode>;

export type SampleTypeKey = keyof typeof typeTree;

export const SAMPLE_TYPE_TREE: Record<SampleTypeKey, TreeNode> = typeTree;

export const SAMPLE_TYPE_ROOTS = [
  "core",
  "dredge",
  "individual_sample",
  "serie_of_sample",
  "inapplicable",
] as const;

export const SAMPLE_TYPES = expandPaths(SAMPLE_TYPE_TREE, SAMPLE_TYPE_ROOTS);

export const SAMPLE_TYPE_HIERARCHY = {
  roots: SAMPLE_TYPE_ROOTS,
  nodes: SAMPLE_TYPE_TREE,
};

export type SampleType = string;

export const sampleTypeSchema = z
  .string()
  .refine((path): path is SampleType => SAMPLE_TYPES.includes(path));
