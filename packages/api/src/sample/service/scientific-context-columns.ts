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
    sc_chief_scientist: fieldSample?.chiefScientist ?? null,
    sc_chief_scientist_orcid: fieldSample?.chiefScientistOrcid ?? null,
    sc_host_institution: fieldSample?.hostInstitution ?? null,
    sc_collector_name:
      fieldSample?.collectorName ?? collectionSpecimen?.collectorName ?? null,
    sc_collector_orcid: fieldSample?.collectorOrcid ?? null,
    sc_research_campaign: fieldSample?.researchCampaign ?? null,
    sc_funding: fieldSample?.funding ?? null,
    sc_research_program_description:
      fieldSample?.researchProgramDescription ?? null,
    sc_field_name: fieldSample?.fieldName ?? null,
    sc_mission_description: fieldSample?.missionDescription ?? null,
    sc_collection_curator: collectionSpecimen?.collectionCurator ?? null,
    sc_collection_origin: collectionSpecimen?.collectionOrigin ?? null,
    sc_collection_context_description:
      collectionSpecimen?.collectionContextDescription ?? null,
  };
}
