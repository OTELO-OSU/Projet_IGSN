import type { CoreProduction } from "../core/core-production-schema.ts";
import type { DataCiteFundingReference } from "./datacite-schema.ts";

export function toDataCiteFundingReferences(
  projects: CoreProduction["projects"],
): DataCiteFundingReference[] {
  const project = projects?.[0];
  if (project == null) return [];
  return (project.fundingReferences ?? []).map(({ value }) => ({
    funderName: project.name,
    funderIdentifier: value,
    funderIdentifierType: "ROR",
    awardNumber: project.funding,
  }));
}
