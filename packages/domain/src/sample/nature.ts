import { z } from "zod";

export const NATURES = [
  "hand_sample",
  "inapplicable",
  "multiple_sample",
  "plot_meb",
  "polished_section",
  "residue",
  "rock_powder",
  "sample_fragment",
  "separateds_minerals",
  "sucre_slab_section",
  "thick_section",
  "thin_section",
] as const;

export const natureSchema = z.enum(NATURES);

export type Nature = z.infer<typeof natureSchema>;
