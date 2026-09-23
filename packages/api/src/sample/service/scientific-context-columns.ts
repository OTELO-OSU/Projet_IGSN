import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

export function scientificContextColumns(
  context: ScientificContext | null | undefined,
) {
  const fieldSample =
    context?.provenanceStatus === "field_sample" ? context : null;
  const collectionSpecimen =
    context?.provenanceStatus === "collection_specimen" ? context : null;
  return {
    sc_provenance_status: context?.provenanceStatus ?? null,
    sc_funder_organizations: fieldSample?.funderOrganizations ?? null,
    sc_research_program_name: fieldSample?.researchProgramName ?? null,
    sc_chief_scientist_user_id: fieldSample?.chiefScientistUserId ?? null,
    sc_chief_scientist_firstname: fieldSample?.chiefScientistFirstname ?? null,
    sc_chief_scientist_lastname: fieldSample?.chiefScientistLastname ?? null,
    sc_host_institution: fieldSample?.hostInstitution ?? null,
    sc_collector_user_id:
      fieldSample?.collectorUserId ??
      collectionSpecimen?.collectorUserId ??
      null,
    sc_collector_firstname:
      fieldSample?.collectorFirstname ??
      collectionSpecimen?.collectorFirstname ??
      null,
    sc_collector_lastname:
      fieldSample?.collectorLastname ??
      collectionSpecimen?.collectorLastname ??
      null,
    sc_funding: fieldSample?.funding ?? null,
    sc_research_program_description:
      fieldSample?.researchProgramDescription ?? null,
    sc_platform_type: fieldSample?.platformType ?? null,
    sc_launch_platform_name: fieldSample?.launchPlatformName ?? null,
    sc_collection_curator_user_id:
      collectionSpecimen?.collectionCuratorUserId ?? null,
    sc_collection_curator_firstname:
      collectionSpecimen?.collectionCuratorFirstname ?? null,
    sc_collection_curator_lastname:
      collectionSpecimen?.collectionCuratorLastname ?? null,
    sc_collection_origin: collectionSpecimen?.collectionOrigin ?? null,
    sc_collection_context_description:
      collectionSpecimen?.collectionContextDescription ?? null,
  };
}
