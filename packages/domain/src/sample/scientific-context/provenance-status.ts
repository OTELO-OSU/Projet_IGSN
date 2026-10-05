export const PROVENANCE_STATUSES = [
  "research_project_sample",
  "collection_specimen",
] as const;

export type ProvenanceStatus = (typeof PROVENANCE_STATUSES)[number];
