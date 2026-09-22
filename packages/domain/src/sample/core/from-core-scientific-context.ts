import type { ScientificContext } from "../scientific-context/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { fromRorUri } from "./core-production-schema.ts";
import { fromCoreAdditionalRoles } from "./from-core-additional-roles.ts";
import { contextCategoryFinders } from "./from-core-context-category.ts";
import { responsibilityFinders } from "./from-core-responsibility.ts";

export function fromCoreScientificContext(
  body: CoreSampleBody,
): ScientificContext | null {
  const { byNotation } = contextCategoryFinders(
    body.classification.contextCategories,
  );
  const { personOf, orcidOf, rorsOf } = responsibilityFinders(
    body.responsibility,
  );
  const provenanceStatus = byNotation("provenance-status")?.id;
  const chiefScientist = personOf("ChiefScientist");
  const collector = personOf("Collector");
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
      chiefScientistFirstname: chiefScientist?.firstname ?? null,
      chiefScientistLastname: chiefScientist?.lastname ?? null,
      chiefScientistOrcid: orcidOf("ChiefScientist"),
      hostInstitution: rorsOf("HostingInstitution"),
      collectorFirstname: collector?.firstname ?? null,
      collectorLastname: collector?.lastname ?? null,
      collectorOrcid: orcidOf("Collector"),
      researchCampaign: project?.campaign ?? null,
      funding: project?.funding ?? null,
      researchProgramDescription: project?.description ?? null,
      fieldName: production.samplingSite_name ?? null,
      missionDescription: production.samplingPurpose ?? null,
      additionalRoles: fromCoreAdditionalRoles(body),
    };
  }
  if (provenanceStatus === "collection_specimen") {
    const curator = personOf("Curator");
    return {
      provenanceStatus,
      collectionCuratorFirstname: curator?.firstname ?? null,
      collectionCuratorLastname: curator?.lastname ?? null,
      collectionOrigin: byNotation("collection-origin")?.id ?? null,
      collectorFirstname: collector?.firstname ?? null,
      collectorLastname: collector?.lastname ?? null,
      collectionContextDescription:
        byNotation("collection-context-description")?.id ?? null,
    };
  }
  return null;
}
