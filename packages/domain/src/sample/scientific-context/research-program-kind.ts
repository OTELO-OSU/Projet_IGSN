import { z } from "zod";

export const RESEARCH_PROGRAM_KINDS = [
  "program",
  "campaign",
  "mission",
  "field",
  "cruise",
] as const;

export const researchProgramKindSchema = z.enum(RESEARCH_PROGRAM_KINDS);

export type ResearchProgramKind = z.infer<typeof researchProgramKindSchema>;
