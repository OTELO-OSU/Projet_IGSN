import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

// The scientific-context block as the form holds it: one flat set of fields
// for both provenance branches, every field nullish when unset (see
// compose-condition.ts). Keys match the domain field names so a schema issue's
// path maps straight onto the draft field (sample-draft-field-errors falls
// back to the joined path).
export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganization: string | null | undefined;
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

// A scientific context as composed from the draft, before the domain schema
// judges it: the branch shape with possibly missing leaf values (undefined is
// dropped by JSON on the wire; see compose-condition.ts for the pattern).
type ScientificContextCandidate =
  | {
      provenanceStatus: "recent_collection";
      funderOrganization: string | undefined;
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

// Draft -> domain scientific context, or null when no provenance status is
// chosen (the whole block is then omitted from the payload). Only the active
// branch's fields are emitted: the hidden branch keeps its values in the form
// while editing, and this exclusion drops them on save (ADR 0015). Empty
// fields drop to undefined so a blank draft field is absent, not an invalid
// ""; trimming and non-empty validation are the domain schema's job (freeText).
export function composeScientificContext(
  draft: ScientificContextDraft,
): ScientificContextCandidate | null {
  if (draft.provenanceStatus === "recent_collection") {
    return {
      provenanceStatus: "recent_collection",
      funderOrganization: draft.funderOrganization || undefined,
      researchProgramName: draft.researchProgramName || undefined,
      researchProgramChief: draft.researchProgramChief || undefined,
      researchProgramChiefOrcid: draft.researchProgramChiefOrcid || undefined,
      researchStructure:
        draft.researchStructure.length > 0
          ? draft.researchStructure
          : undefined,
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

// A saved scientific context, spread back into the flat draft.
export function toScientificContextDraft(
  value: ScientificContext | null | undefined,
): ScientificContextDraft {
  const recent =
    value?.provenanceStatus === "recent_collection" ? value : undefined;
  const historical =
    value?.provenanceStatus === "historical_specimen" ? value : undefined;
  return {
    provenanceStatus: value?.provenanceStatus,
    funderOrganization: recent?.funderOrganization ?? undefined,
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
