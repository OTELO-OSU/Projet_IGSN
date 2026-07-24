// The scientific-context discriminant: how the sample entered science. A
// standalone list so forms can enumerate the choices; the discriminated union
// in model.ts carries the same codes as literals, so no schema is needed here.
export const PROVENANCE_STATUSES = [
  "recent_collection",
  "historical_specimen",
] as const;

export type ProvenanceStatus = (typeof PROVENANCE_STATUSES)[number];
