import type { ScientificContext } from "../scientific-context/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { fromRorUri } from "./core-production-schema.ts";
import { contextCategoryFinders } from "./from-core-context-category.ts";
import { responsibilityFinders } from "./from-core-responsibility.ts";

export function fromCoreScientificContext(
  body: CoreSampleBody,
): ScientificContext | null {
  const { byNotation } = contextCategoryFinders(
    body.classification.contextCategories,
  );
  const { agentOf, orcidOf, rorsOf } = responsibilityFinders(
    body.responsibility,
  );
  const provenanceStatus = byNotation("provenance-status")?.id;
  const production = body.production;
  const project = production.projects?.[0];

  if (provenanceStatus === "field_sample") {
    return {
      provenanceStatus,
      funderOrganizations:
        project?.fundingReferences?.map((reference) =>
          fromRorUri(reference.value),
        ) ?? null,
      researchProgramName: project?.name ?? null,
      chiefScientist: agentOf("ChiefScientist")?.name ?? null,
      chiefScientistOrcid: orcidOf("ChiefScientist"),
      hostInstitution: rorsOf("HostingInstitution"),
      collectorName: agentOf("Collector")?.name ?? null,
      collectorOrcid: orcidOf("Collector"),
      researchCampaign: project?.campaign ?? null,
      funding: project?.funding ?? null,
      researchProgramDescription: project?.description ?? null,
      fieldName: production.samplingSite_name ?? null,
      missionDescription: production.samplingPurpose ?? null,
    };
  }
  if (provenanceStatus === "collection_specimen") {
    return {
      provenanceStatus,
      collectionCurator: agentOf("Curator")?.name ?? null,
      collectionOrigin: byNotation("collection-origin")?.id ?? null,
      collectorName: agentOf("Collector")?.name ?? null,
      collectionContextDescription:
        byNotation("collection-context-description")?.id ?? null,
    };
  }
  return null;
}
