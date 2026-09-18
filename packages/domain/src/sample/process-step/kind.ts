import { z } from "zod";

export const PROCESS_STEP_KINDS = [
  "subsampling",
  "derivation",
  "preparation",
  "transformation",
  "preservation",
  "other",
] as const;

export const processStepKindSchema = z.enum(PROCESS_STEP_KINDS);

export type ProcessStepKind = z.infer<typeof processStepKindSchema>;
