import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

export function scientificContextColumns(
  context: ScientificContext | null | undefined,
) {
  const recent =
    context?.provenanceStatus === "recent_collection" ? context : null;
  const historical =
    context?.provenanceStatus === "historical_specimen" ? context : null;
  return {
    sc_provenance_status: context?.provenanceStatus ?? null,
    sc_funder_organizations: recent?.funderOrganizations ?? null,
    sc_research_program_name: recent?.researchProgramName ?? null,
    sc_research_program_chief: recent?.researchProgramChief ?? null,
    sc_research_program_chief_orcid: recent?.researchProgramChiefOrcid ?? null,
    sc_research_structure: recent?.researchStructure ?? null,
    sc_collector_name:
      recent?.collectorName ?? historical?.collectorName ?? null,
    sc_collector_orcid: recent?.collectorOrcid ?? null,
    sc_research_campaign: recent?.researchCampaign ?? null,
    sc_funding: recent?.funding ?? null,
    sc_research_program_description: recent?.researchProgramDescription ?? null,
    sc_field_name: recent?.fieldName ?? null,
    sc_mission_description: recent?.missionDescription ?? null,
    sc_collection_curator: historical?.collectionCurator ?? null,
    sc_collection_origin: historical?.collectionOrigin ?? null,
    sc_collection_context_description:
      historical?.collectionContextDescription ?? null,
  };
}
