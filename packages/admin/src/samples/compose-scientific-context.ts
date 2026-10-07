import type { SampleAdditionalRole } from "@projet-igsn/domain/sample/additional-role/model";
import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { PlatformType } from "@projet-igsn/domain/sample/scientific-context/platform-type";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import type { ResearchProgramKind } from "@projet-igsn/domain/sample/scientific-context/research-program-kind";

import type { AdditionalRoleDraft } from "#/samples/sample-draft-schema.ts";

import { composeContact } from "#/samples/compose-contact.ts";
import { draftDefault, type DraftOptions } from "#/samples/draft-defaults.ts";

export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganizations: string[];
  researchProgramName: string | null | undefined;
  researchProgramKind: ResearchProgramKind | undefined;
  chiefScientistUserId: string | null | undefined;
  chiefScientistFirstname: string | null | undefined;
  chiefScientistLastname: string | null | undefined;
  hostInstitution: string[];
  collectorUserId: string | null | undefined;
  collectorFirstname: string | null | undefined;
  collectorLastname: string | null | undefined;
  funding: string | null | undefined;
  researchProgramDescription: string | null | undefined;
  platformType: PlatformType | undefined;
  launchPlatformName: string | null | undefined;
  additionalRoles: AdditionalRoleDraft[];
  collectionOrigin: CollectionOrigin | undefined;
  collectionContextDescription: string | null | undefined;
};

type ScientificContextCandidate =
  | {
      provenanceStatus: "research_project_sample";
      funderOrganizations: string[] | undefined;
      researchProgramName: string | undefined;
      researchProgramKind: ResearchProgramKind | undefined;
      chiefScientistUserId: string | undefined;
      chiefScientistFirstname: string | undefined;
      chiefScientistLastname: string | undefined;
      hostInstitution: string[] | undefined;
      collectorUserId: string | undefined;
      collectorFirstname: string | undefined;
      collectorLastname: string | undefined;
      funding: string | undefined;
      researchProgramDescription: string | undefined;
      platformType: PlatformType | undefined;
      launchPlatformName: string | undefined;
      additionalRoles: SampleAdditionalRole[];
    }
  | {
      provenanceStatus: "collection_specimen";
      collectionOrigin: CollectionOrigin | undefined;
      collectorUserId: string | undefined;
      collectorFirstname: string | undefined;
      collectorLastname: string | undefined;
      collectionContextDescription: string | undefined;
    };

export const nonEmpty = (rors: string[]) =>
  rors.length > 0 ? rors : undefined;

export function composeScientificContext(
  draft: ScientificContextDraft,
): ScientificContextCandidate | null {
  const chiefScientist = composeContact(
    draft.chiefScientistUserId,
    draft.chiefScientistFirstname,
    draft.chiefScientistLastname,
  );
  const collector = composeContact(
    draft.collectorUserId,
    draft.collectorFirstname,
    draft.collectorLastname,
  );
  if (draft.provenanceStatus === "research_project_sample") {
    return {
      provenanceStatus: "research_project_sample",
      funderOrganizations: nonEmpty(draft.funderOrganizations),
      researchProgramName: draft.researchProgramName || undefined,
      researchProgramKind: draft.researchProgramName
        ? draft.researchProgramKind
        : undefined,
      chiefScientistUserId: chiefScientist.userId,
      chiefScientistFirstname: chiefScientist.firstname,
      chiefScientistLastname: chiefScientist.lastname,
      hostInstitution: nonEmpty(draft.hostInstitution),
      collectorUserId: collector.userId,
      collectorFirstname: collector.firstname,
      collectorLastname: collector.lastname,
      funding: draft.funding || undefined,
      researchProgramDescription: draft.researchProgramDescription || undefined,
      platformType: draft.platformType,
      launchPlatformName: draft.launchPlatformName || undefined,
      additionalRoles: draft.additionalRoles.map((row) => {
        const person = composeContact(
          row.personUserId,
          row.personFirstname,
          row.personLastname,
        );
        return {
          role: row.role,
          personUserId: person.userId,
          personFirstname: person.firstname,
          personLastname: person.lastname,
        };
      }),
    };
  }
  if (draft.provenanceStatus === "collection_specimen") {
    return {
      provenanceStatus: "collection_specimen",
      collectionOrigin: draft.collectionOrigin,
      collectorUserId: collector.userId,
      collectorFirstname: collector.firstname,
      collectorLastname: collector.lastname,
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
  const researchProjectSample =
    value?.provenanceStatus === "research_project_sample" ? value : undefined;
  const collectionSpecimen =
    value?.provenanceStatus === "collection_specimen" ? value : undefined;
  return {
    provenanceStatus:
      value?.provenanceStatus ??
      draftDefault(options, "research_project_sample"),
    funderOrganizations: researchProjectSample?.funderOrganizations ?? [],
    researchProgramName:
      researchProjectSample?.researchProgramName ?? undefined,
    researchProgramKind:
      researchProjectSample?.researchProgramKind ?? undefined,
    chiefScientistUserId:
      researchProjectSample?.chiefScientistUserId ?? undefined,
    chiefScientistFirstname:
      researchProjectSample?.chiefScientistFirstname ?? undefined,
    chiefScientistLastname:
      researchProjectSample?.chiefScientistLastname ?? undefined,
    hostInstitution: researchProjectSample?.hostInstitution ?? [],
    collectorUserId:
      researchProjectSample?.collectorUserId ??
      collectionSpecimen?.collectorUserId ??
      undefined,
    collectorFirstname:
      researchProjectSample?.collectorFirstname ??
      collectionSpecimen?.collectorFirstname ??
      undefined,
    collectorLastname:
      researchProjectSample?.collectorLastname ??
      collectionSpecimen?.collectorLastname ??
      undefined,
    funding: researchProjectSample?.funding ?? undefined,
    researchProgramDescription:
      researchProjectSample?.researchProgramDescription ?? undefined,
    platformType: researchProjectSample?.platformType ?? undefined,
    launchPlatformName: researchProjectSample?.launchPlatformName ?? undefined,
    additionalRoles: (researchProjectSample?.additionalRoles ?? []).map(
      (row) => ({
        key: crypto.randomUUID(),
        role: row.role,
        personUserId: row.personUserId ?? undefined,
        personFirstname: row.personFirstname ?? undefined,
        personLastname: row.personLastname ?? undefined,
      }),
    ),
    collectionOrigin: collectionSpecimen?.collectionOrigin ?? undefined,
    collectionContextDescription:
      collectionSpecimen?.collectionContextDescription ?? undefined,
  };
}
