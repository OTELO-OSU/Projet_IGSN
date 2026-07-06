import { z } from "zod";

import {
  type TaxonomyPath,
  type TaxonomyTree,
  taxonomyPaths,
} from "../taxonomy/taxonomy-paths.ts";

export const SAMPLE_TYPE_TREE = {
  core: {
    half_round: {},
    piece: {},
    quarter_round: {},
    section: {},
    section_half: {},
    sub_piece: {},
    whole_round: {},
    cuttings: {},
    individual_sample: {},
    individual_sample_in_core: {},
    sample_from_a_cut: {},
    catcher: {},
    slab: {},
    casq_section: {},
    casq_section_large_lu_gutter: {},
    casq_section_narrow_nu_gutter: {},
    outcrop_preserved_stratigraphy: {},
  },
  dredge: {},
  individual_sample: {},
  serie_of_sample: {},
  inapplicable: {},
} as const satisfies TaxonomyTree;

export type SampleType = TaxonomyPath<typeof SAMPLE_TYPE_TREE>;

export const SAMPLE_TYPES = taxonomyPaths(SAMPLE_TYPE_TREE);

export const sampleTypeSchema = z.enum(
  SAMPLE_TYPES as [SampleType, ...SampleType[]],
);
