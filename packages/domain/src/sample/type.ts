import { z } from "zod";

// Hierarchical controlled vocabulary stored as dot-separated paths (ADR 0008).
// An ancestor path ("core") is a valid, partial classification.
export const sampleTypeSchema = z.enum([
  "core",
  "core.half_round",
  "core.piece",
  "core.quarter_round",
  "core.section",
  "core.section_half",
  "core.sub_piece",
  "core.whole_round",
  "core.cuttings",
  "core.individual_sample",
  "core.individual_sample_in_core",
  "core.sample_from_a_cut",
  "core.catcher",
  "core.slab",
  "core.casq_section",
  "core.casq_section_large_lu_gutter",
  "core.casq_section_narrow_nu_gutter",
  "core.outcrop_preserved_stratigraphy",
  "dredge",
  "individual_sample",
  "serie_of_sample",
  "inapplicable",
]);

export type SampleType = z.infer<typeof sampleTypeSchema>;

export const SAMPLE_TYPES = sampleTypeSchema.options;
