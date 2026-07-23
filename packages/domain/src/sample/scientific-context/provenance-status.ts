import { z } from "zod";

// The scientific-context discriminant: how the sample entered science. Also a
// standalone enum so forms can enumerate the choices; the discriminated union
// in model.ts carries the same codes as literals.
export const PROVENANCE_STATUSES = [
  "recent_collection",
  "historical_specimen",
] as const;

export const provenanceStatusSchema = z.enum(PROVENANCE_STATUSES);

export type ProvenanceStatus = z.infer<typeof provenanceStatusSchema>;
