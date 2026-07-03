import { z } from "zod";

export const NATURES = [
  "hand_sample",
  "inapplicable",
  "multiple_sample",
  "polished_section",
  "residue",
  "rock_chips",
  "rock_powder",
  "sample_fragment",
  "sem_mount",
  "separated_materials",
  "thick_section",
  "thin_section",
] as const;

export const natureSchema = z.enum(NATURES);

export type Nature = z.infer<typeof natureSchema>;
