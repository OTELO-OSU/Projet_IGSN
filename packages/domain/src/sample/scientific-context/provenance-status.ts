export const PROVENANCE_STATUSES = [
  "recent_collection",
  "historical_specimen",
] as const;

export type ProvenanceStatus = (typeof PROVENANCE_STATUSES)[number];
