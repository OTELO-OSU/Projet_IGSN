import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import { draftDefault, type DraftOptions } from "#/samples/draft-defaults.ts";

export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganizations: string[];
  researchProgramName: string | null | undefined;
  chiefScientistFirstname: string | null | undefined;
  chiefScientistLastname: string | null | undefined;
  chiefScientistOrcid: string | null | undefined;
  hostInstitution: string[];
  collectorFirstname: string | null | undefined;
  collectorLastname: string | null | undefined;
  collectorOrcid: string | null | undefined;
  researchCampaign: string | null | undefined;
  funding: string | null | undefined;
  researchProgramDescription: string | null | undefined;
  fieldName: string | null | undefined;
  missionDescription: string | null | undefined;
  collectionCuratorFirstname: string | null | undefined;
  collectionCuratorLastname: string | null | undefined;
  collectionOrigin: CollectionOrigin | undefined;
  collectionContextDescription: string | null | undefined;
};

type ScientificContextCandidate =
  | {
      provenanceStatus: "field_sample";
      funderOrganizations: string[] | undefined;
      researchProgramName: string | undefined;
      chiefScientistFirstname: string | undefined;
      chiefScientistLastname: string | undefined;
      chiefScientistOrcid: string | undefined;
      hostInstitution: string[] | undefined;
      collectorFirstname: string | undefined;
      collectorLastname: string | undefined;
      collectorOrcid: string | undefined;
      researchCampaign: string | undefined;
      funding: string | undefined;
      researchProgramDescription: string | undefined;
      fieldName: string | undefined;
      missionDescription: string | undefined;
    }
  | {
      provenanceStatus: "collection_specimen";
      collectionCuratorFirstname: string | undefined;
      collectionCuratorLastname: string | undefined;
      collectionOrigin: CollectionOrigin | undefined;
      collectorFirstname: string | undefined;
      collectorLastname: string | undefined;
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
      chiefScientistFirstname: draft.chiefScientistFirstname || undefined,
      chiefScientistLastname: draft.chiefScientistLastname || undefined,
      chiefScientistOrcid: draft.chiefScientistOrcid || undefined,
      hostInstitution: nonEmpty(draft.hostInstitution),
      collectorFirstname: draft.collectorFirstname || undefined,
      collectorLastname: draft.collectorLastname || undefined,
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
      collectionCuratorFirstname: draft.collectionCuratorFirstname || undefined,
      collectionCuratorLastname: draft.collectionCuratorLastname || undefined,
      collectionOrigin: draft.collectionOrigin,
      collectorFirstname: draft.collectorFirstname || undefined,
      collectorLastname: draft.collectorLastname || undefined,
      collectionContextDescription:
        draft.collectionContextDescription || undefined,
    };
  }
  return null;
}

export function toScientificContextDraft(
  value: ScientificContext | null | undefined,
  options: DraftOptions = {},
): ScientificContextDraft {
  const fieldSample =
    value?.provenanceStatus === "field_sample" ? value : undefined;
  const collectionSpecimen =
    value?.provenanceStatus === "collection_specimen" ? value : undefined;
  return {
    provenanceStatus:
      value?.provenanceStatus ?? draftDefault(options, "field_sample"),
    funderOrganizations: fieldSample?.funderOrganizations ?? [],
    researchProgramName: fieldSample?.researchProgramName ?? undefined,
    chiefScientistFirstname: fieldSample?.chiefScientistFirstname ?? undefined,
    chiefScientistLastname: fieldSample?.chiefScientistLastname ?? undefined,
    chiefScientistOrcid: fieldSample?.chiefScientistOrcid ?? undefined,
    hostInstitution: fieldSample?.hostInstitution ?? [],
    collectorFirstname:
      fieldSample?.collectorFirstname ??
      collectionSpecimen?.collectorFirstname ??
      undefined,
    collectorLastname:
      fieldSample?.collectorLastname ??
      collectionSpecimen?.collectorLastname ??
      undefined,
    collectorOrcid: fieldSample?.collectorOrcid ?? undefined,
    researchCampaign: fieldSample?.researchCampaign ?? undefined,
    funding: fieldSample?.funding ?? undefined,
    researchProgramDescription:
      fieldSample?.researchProgramDescription ?? undefined,
    fieldName: fieldSample?.fieldName ?? undefined,
    missionDescription: fieldSample?.missionDescription ?? undefined,
    collectionCuratorFirstname:
      collectionSpecimen?.collectionCuratorFirstname ?? undefined,
    collectionCuratorLastname:
      collectionSpecimen?.collectionCuratorLastname ?? undefined,
    collectionOrigin: collectionSpecimen?.collectionOrigin ?? undefined,
    collectionContextDescription:
      collectionSpecimen?.collectionContextDescription ?? undefined,
  };
}
