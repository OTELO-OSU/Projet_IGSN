export const PROVENANCE_STATUSES = [
  "field_sample",
  "collection_specimen",
] as const;

export type ProvenanceStatus = (typeof PROVENANCE_STATUSES)[number];
