import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

export function scientificContextColumns(
  context: ScientificContext | null | undefined,
) {
  const researchProjectSample =
    context?.provenanceStatus === "research_project_sample" ? context : null;
  const collectionSpecimen =
    context?.provenanceStatus === "collection_specimen" ? context : null;
  return {
    sc_provenance_status: context?.provenanceStatus ?? null,
    sc_funder_organizations: researchProjectSample?.funderOrganizations ?? null,
    sc_research_program_name:
      researchProjectSample?.researchProgramName ?? null,
    sc_research_program_kind:
      researchProjectSample?.researchProgramKind ?? null,
    sc_chief_scientist_user_id:
      researchProjectSample?.chiefScientistUserId ?? null,
    sc_chief_scientist_firstname:
      researchProjectSample?.chiefScientistFirstname ?? null,
    sc_chief_scientist_lastname:
      researchProjectSample?.chiefScientistLastname ?? null,
    sc_host_institution: researchProjectSample?.hostInstitution ?? null,
    sc_collector_user_id:
      researchProjectSample?.collectorUserId ??
      collectionSpecimen?.collectorUserId ??
      null,
    sc_collector_firstname:
      researchProjectSample?.collectorFirstname ??
      collectionSpecimen?.collectorFirstname ??
      null,
    sc_collector_lastname:
      researchProjectSample?.collectorLastname ??
      collectionSpecimen?.collectorLastname ??
      null,
    sc_funding: researchProjectSample?.funding ?? null,
    sc_research_program_description:
      researchProjectSample?.researchProgramDescription ?? null,
    sc_platform_type: researchProjectSample?.platformType ?? null,
    sc_launch_platform_name: researchProjectSample?.launchPlatformName ?? null,
    sc_collection_origin: collectionSpecimen?.collectionOrigin ?? null,
    sc_collection_context_description:
      collectionSpecimen?.collectionContextDescription ?? null,
  };
}
