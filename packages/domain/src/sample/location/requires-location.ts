import type { ProvenanceStatus } from "../scientific-context/provenance-status.ts";

export const requiresLocation = (
  provenanceStatus: ProvenanceStatus | null | undefined,
): boolean => provenanceStatus !== "collection_specimen";
