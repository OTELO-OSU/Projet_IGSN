import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

// Domain scientific context -> flat sample columns (same pattern as the
// location, ADR 0014), shared by insert and update. `sc_provenance_status` is
// the discriminant; only the current branch's columns carry a value, the other
// branch's stay null. A null/absent context writes null everywhere, so an
// update clears what the input no longer carries.
export function scientificContextColumns(
  context: ScientificContext | null | undefined,
) {
  const recent =
    context?.provenanceStatus === "recent_collection" ? context : null;
  const historical =
    context?.provenanceStatus === "historical_specimen" ? context : null;
  return {
    sc_provenance_status: context?.provenanceStatus ?? null,
    sc_funder_organization: recent?.funderOrganization ?? null,
    sc_research_program_name: recent?.researchProgramName ?? null,
    sc_research_program_chief: recent?.researchProgramChief ?? null,
    sc_research_program_chief_orcid: recent?.researchProgramChiefOrcid ?? null,
    sc_research_structure: recent?.researchStructure ?? null,
    // Shared by both branches.
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
