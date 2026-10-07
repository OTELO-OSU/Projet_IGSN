import type { z } from "zod";

import type { createScientificContextSchema } from "../scientific-context/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { fromRorUri } from "./core-production-schema.ts";
import { fromCoreAdditionalRoles } from "./from-core-additional-roles.ts";
import { contextCategoryFinders } from "./from-core-context-category.ts";
import { responsibilityFinders } from "./from-core-responsibility.ts";

export function fromCoreScientificContext(
  body: CoreSampleBody,
): z.input<typeof createScientificContextSchema> | null {
  const { byNotation } = contextCategoryFinders(
    body.classification.contextCategories,
  );
  const { personOf, rorsOf } = responsibilityFinders(body.responsibility);
  const provenanceStatus = byNotation("provenance-status")?.id;
  const chiefScientist = personOf("ChiefScientist");
  const collector = personOf("Collector");
  const project = body.production.projects?.[0];
  const fieldwork = body.extensions?.fieldwork;
  const [researchProgramKind, researchProgramName] = (
    [
      ["program", project?.name],
      ["campaign", project?.campaign],
      ["field", body.production.samplingSite_name],
      ["mission", body.production.samplingPurpose],
    ] as const
  ).find(([, name]) => name != null) ?? [null, null];

  if (provenanceStatus === "research_project_sample") {
    return {
      provenanceStatus,
      funderOrganizations:
        project?.fundingReferences?.map((reference) =>
          fromRorUri(reference.value),
        ) ?? null,
      researchProgramName,
      researchProgramKind,
      chiefScientistFirstname: chiefScientist?.firstname ?? null,
      chiefScientistLastname: chiefScientist?.lastname ?? null,
      hostInstitution: rorsOf("HostingInstitution"),
      collectorFirstname: collector?.firstname ?? null,
      collectorLastname: collector?.lastname ?? null,
      funding: project?.funding ?? null,
      researchProgramDescription: project?.description ?? null,
      platformType: fieldwork?.platformType?.id ?? null,
      launchPlatformName: fieldwork?.launchPlatformName ?? null,
      additionalRoles: fromCoreAdditionalRoles(body),
    };
  }
  if (provenanceStatus === "collection_specimen") {
    return {
      provenanceStatus,
      collectionOrigin: byNotation("collection-origin")?.id ?? null,
      collectorFirstname: collector?.firstname ?? null,
      collectorLastname: collector?.lastname ?? null,
      collectionContextDescription:
        byNotation("collection-context-description")?.id ?? null,
    };
  }
  return null;
}
