import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

// The scientific-context block as the form holds it: one flat set of fields
// for both provenance branches, plain strings blank when empty. Keys match the
// domain field names so a schema issue's path maps straight onto the draft
// field (sample-draft-field-errors falls back to the joined path).
export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganization: string | undefined;
  researchProgramName: string;
  researchProgramChief: string;
  researchProgramChiefOrcid: string;
  researchStructure: string[];
  collectorName: string;
  collectorOrcid: string;
  researchCampaign: string;
  funding: string;
  researchProgramDescription: string;
  fieldName: string;
  missionDescription: string;
  collectionCurator: string;
  collectionOrigin: CollectionOrigin | undefined;
  collectionContextDescription: string;
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

const text = (value: string) => value.trim() || undefined;

// Draft -> domain scientific context, or null when no provenance status is
// chosen (the whole block is then omitted from the payload). Only the active
// branch's fields are emitted; the status field's listener already clears the
// other branch on switch, so this is the payload-side half of that rule.
export function composeScientificContext(
  draft: ScientificContextDraft,
): ScientificContextCandidate | null {
  if (draft.provenanceStatus === "recent_collection") {
    return {
      provenanceStatus: "recent_collection",
      funderOrganization: draft.funderOrganization || undefined,
      researchProgramName: text(draft.researchProgramName),
      researchProgramChief: text(draft.researchProgramChief),
      researchProgramChiefOrcid: text(draft.researchProgramChiefOrcid),
      researchStructure:
        draft.researchStructure.length > 0
          ? draft.researchStructure
          : undefined,
      collectorName: text(draft.collectorName),
      collectorOrcid: text(draft.collectorOrcid),
      researchCampaign: text(draft.researchCampaign),
      funding: text(draft.funding),
      researchProgramDescription: text(draft.researchProgramDescription),
      fieldName: text(draft.fieldName),
      missionDescription: text(draft.missionDescription),
    };
  }
  if (draft.provenanceStatus === "historical_specimen") {
    return {
      provenanceStatus: "historical_specimen",
      collectionCurator: text(draft.collectionCurator),
      collectionOrigin: draft.collectionOrigin,
      collectorName: text(draft.collectorName),
      collectionContextDescription: text(draft.collectionContextDescription),
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
    researchProgramName: recent?.researchProgramName ?? "",
    researchProgramChief: recent?.researchProgramChief ?? "",
    researchProgramChiefOrcid: recent?.researchProgramChiefOrcid ?? "",
    researchStructure: recent?.researchStructure ?? [],
    collectorName: recent?.collectorName ?? historical?.collectorName ?? "",
    collectorOrcid: recent?.collectorOrcid ?? "",
    researchCampaign: recent?.researchCampaign ?? "",
    funding: recent?.funding ?? "",
    researchProgramDescription: recent?.researchProgramDescription ?? "",
    fieldName: recent?.fieldName ?? "",
    missionDescription: recent?.missionDescription ?? "",
    collectionCurator: historical?.collectionCurator ?? "",
    collectionOrigin: historical?.collectionOrigin ?? undefined,
    collectionContextDescription:
      historical?.collectionContextDescription ?? "",
  };
}
