import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganizations: string[];
  researchProgramName: string | null | undefined;
  chiefScientist: string | null | undefined;
  chiefScientistOrcid: string | null | undefined;
  hostInstitution: string[];
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
      provenanceStatus: "field_sample";
      funderOrganizations: string[] | undefined;
      researchProgramName: string | undefined;
      chiefScientist: string | undefined;
      chiefScientistOrcid: string | undefined;
      hostInstitution: string[] | undefined;
      collectorName: string | undefined;
      collectorOrcid: string | undefined;
      researchCampaign: string | undefined;
      funding: string | undefined;
      researchProgramDescription: string | undefined;
      fieldName: string | undefined;
      missionDescription: string | undefined;
    }
  | {
      provenanceStatus: "collection_specimen";
      collectionCurator: string | undefined;
      collectionOrigin: CollectionOrigin | undefined;
      collectorName: string | undefined;
      collectionContextDescription: string | undefined;
    };

export const nonEmpty = (rors: string[]) =>
  rors.length > 0 ? rors : undefined;

export function composeScientificContext(
  draft: ScientificContextDraft,
): ScientificContextCandidate | null {
  if (draft.provenanceStatus === "field_sample") {
    return {
      provenanceStatus: "field_sample",
      funderOrganizations: nonEmpty(draft.funderOrganizations),
      researchProgramName: draft.researchProgramName || undefined,
      chiefScientist: draft.chiefScientist || undefined,
      chiefScientistOrcid: draft.chiefScientistOrcid || undefined,
      hostInstitution: nonEmpty(draft.hostInstitution),
      collectorName: draft.collectorName || undefined,
      collectorOrcid: draft.collectorOrcid || undefined,
      researchCampaign: draft.researchCampaign || undefined,
      funding: draft.funding || undefined,
      researchProgramDescription: draft.researchProgramDescription || undefined,
      fieldName: draft.fieldName || undefined,
      missionDescription: draft.missionDescription || undefined,
    };
  }
  if (draft.provenanceStatus === "collection_specimen") {
    return {
      provenanceStatus: "collection_specimen",
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
  const fieldSample =
    value?.provenanceStatus === "field_sample" ? value : undefined;
  const collectionSpecimen =
    value?.provenanceStatus === "collection_specimen" ? value : undefined;
  return {
    provenanceStatus: value?.provenanceStatus,
    funderOrganizations: fieldSample?.funderOrganizations ?? [],
    researchProgramName: fieldSample?.researchProgramName ?? undefined,
    chiefScientist: fieldSample?.chiefScientist ?? undefined,
    chiefScientistOrcid: fieldSample?.chiefScientistOrcid ?? undefined,
    hostInstitution: fieldSample?.hostInstitution ?? [],
    collectorName:
      fieldSample?.collectorName ??
      collectionSpecimen?.collectorName ??
      undefined,
    collectorOrcid: fieldSample?.collectorOrcid ?? undefined,
    researchCampaign: fieldSample?.researchCampaign ?? undefined,
    funding: fieldSample?.funding ?? undefined,
    researchProgramDescription:
      fieldSample?.researchProgramDescription ?? undefined,
    fieldName: fieldSample?.fieldName ?? undefined,
    missionDescription: fieldSample?.missionDescription ?? undefined,
    collectionCurator: collectionSpecimen?.collectionCurator ?? undefined,
    collectionOrigin: collectionSpecimen?.collectionOrigin ?? undefined,
    collectionContextDescription:
      collectionSpecimen?.collectionContextDescription ?? undefined,
  };
}
