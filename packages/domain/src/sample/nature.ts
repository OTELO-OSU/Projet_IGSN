import { z } from "zod";

export const NATURES = [
  "hand_sample",
  "multiple_sample",
  "polished_section",
  "powder",
  "residue",
  "resin_block",
  "rock_chips",
  "sample_fragment",
  "sem_mount",
  "separated_minerals",
  "thick_section",
  "thin_section",
  "inapplicable",
] as const;

export const natureSchema = z.enum(NATURES);

export type Nature = z.infer<typeof natureSchema>;

export const DEFAULT_NATURE: Nature = "hand_sample";
