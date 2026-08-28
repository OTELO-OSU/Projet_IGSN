import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganizations: string[];
  researchProgramName: string | null | undefined;
  researchProgramChief: string | null | undefined;
  researchProgramChiefOrcid: string | null | undefined;
  researchStructure: string[];
  collectorName: string | null | undefined;
  collectorOrcid: string | null | undefined;
  researchCampaign: string | null | undefined;
  funding: string | null | undefined;
  researchProgramDescription: string | null | undefined;
  fieldName: string | null | undefined;
  missionDescription: string | null | undefined;
  collectionCurator: string | null | undefined;
  collectionOrigin: CollectionOrigin | undefined;
  collectionContextDescription: string | null | undefined;
};

type ScientificContextCandidate =
  | {
      provenanceStatus: "recent_collection";
      funderOrganizations: string[] | undefined;
      researchProgramName: string | undefined;
      researchProgramChief: string | undefined;
      researchProgramChiefOrcid: string | undefined;
      researchStructure: string[] | undefined;
      collectorName: string | undefined;
      collectorOrcid: string | undefined;
      researchCampaign: string | undefined;
      funding: string | undefined;
      researchProgramDescription: string | undefined;
      fieldName: string | undefined;
      missionDescription: string | undefined;
    }
  | {
      provenanceStatus: "historical_specimen";
      collectionCurator: string | undefined;
      collectionOrigin: CollectionOrigin | undefined;
      collectorName: string | undefined;
      collectionContextDescription: string | undefined;
    };

const nonEmpty = (rors: string[]) => (rors.length > 0 ? rors : undefined);

export function composeScientificContext(
  draft: ScientificContextDraft,
): ScientificContextCandidate | null {
  if (draft.provenanceStatus === "recent_collection") {
    return {
      provenanceStatus: "recent_collection",
      funderOrganizations: nonEmpty(draft.funderOrganizations),
      researchProgramName: draft.researchProgramName || undefined,
      researchProgramChief: draft.researchProgramChief || undefined,
      researchProgramChiefOrcid: draft.researchProgramChiefOrcid || undefined,
      researchStructure: nonEmpty(draft.researchStructure),
      collectorName: draft.collectorName || undefined,
      collectorOrcid: draft.collectorOrcid || undefined,
      researchCampaign: draft.researchCampaign || undefined,
      funding: draft.funding || undefined,
      researchProgramDescription: draft.researchProgramDescription || undefined,
      fieldName: draft.fieldName || undefined,
      missionDescription: draft.missionDescription || undefined,
    };
  }
  if (draft.provenanceStatus === "historical_specimen") {
    return {
      provenanceStatus: "historical_specimen",
      collectionCurator: draft.collectionCurator || undefined,
      collectionOrigin: draft.collectionOrigin,
      collectorName: draft.collectorName || undefined,
      collectionContextDescription:
        draft.collectionContextDescription || undefined,
    };
  }
  return null;
}

export function toScientificContextDraft(
  value: ScientificContext | null | undefined,
): ScientificContextDraft {
  const recent =
    value?.provenanceStatus === "recent_collection" ? value : undefined;
  const historical =
    value?.provenanceStatus === "historical_specimen" ? value : undefined;
  return {
    provenanceStatus: value?.provenanceStatus,
    funderOrganizations: recent?.funderOrganizations ?? [],
    researchProgramName: recent?.researchProgramName ?? undefined,
    researchProgramChief: recent?.researchProgramChief ?? undefined,
    researchProgramChiefOrcid: recent?.researchProgramChiefOrcid ?? undefined,
    researchStructure: recent?.researchStructure ?? [],
    collectorName:
      recent?.collectorName ?? historical?.collectorName ?? undefined,
    collectorOrcid: recent?.collectorOrcid ?? undefined,
    researchCampaign: recent?.researchCampaign ?? undefined,
    funding: recent?.funding ?? undefined,
    researchProgramDescription: recent?.researchProgramDescription ?? undefined,
    fieldName: recent?.fieldName ?? undefined,
    missionDescription: recent?.missionDescription ?? undefined,
    collectionCurator: historical?.collectionCurator ?? undefined,
    collectionOrigin: historical?.collectionOrigin ?? undefined,
    collectionContextDescription:
      historical?.collectionContextDescription ?? undefined,
  };
}
