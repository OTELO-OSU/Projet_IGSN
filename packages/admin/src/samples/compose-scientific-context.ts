import type { SampleAdditionalRole } from "@projet-igsn/domain/sample/additional-role/model";
import type { CollectionOrigin } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";
import type { PlatformType } from "@projet-igsn/domain/sample/scientific-context/platform-type";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import type { AdditionalRoleDraft } from "#/samples/sample-draft-schema.ts";

import { composeContact } from "#/samples/compose-contact.ts";
import { draftDefault, type DraftOptions } from "#/samples/draft-defaults.ts";

export type ScientificContextDraft = {
  provenanceStatus: ProvenanceStatus | undefined;
  funderOrganizations: string[];
  researchProgramName: string | null | undefined;
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
  collectionCuratorUserId: string | null | undefined;
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
      collectionCuratorUserId: string | undefined;
      collectionCuratorFirstname: string | undefined;
      collectionCuratorLastname: string | undefined;
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
  if (draft.provenanceStatus === "field_sample") {
    return {
      provenanceStatus: "field_sample",
      funderOrganizations: nonEmpty(draft.funderOrganizations),
      researchProgramName: draft.researchProgramName || undefined,
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
    const collectionCurator = composeContact(
      draft.collectionCuratorUserId,
      draft.collectionCuratorFirstname,
      draft.collectionCuratorLastname,
    );
    return {
      provenanceStatus: "collection_specimen",
      collectionCuratorUserId: collectionCurator.userId,
      collectionCuratorFirstname: collectionCurator.firstname,
      collectionCuratorLastname: collectionCurator.lastname,
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
  const fieldSample =
    value?.provenanceStatus === "field_sample" ? value : undefined;
  const collectionSpecimen =
    value?.provenanceStatus === "collection_specimen" ? value : undefined;
  return {
    provenanceStatus:
      value?.provenanceStatus ?? draftDefault(options, "field_sample"),
    funderOrganizations: fieldSample?.funderOrganizations ?? [],
    researchProgramName: fieldSample?.researchProgramName ?? undefined,
    chiefScientistUserId: fieldSample?.chiefScientistUserId ?? undefined,
    chiefScientistFirstname: fieldSample?.chiefScientistFirstname ?? undefined,
    chiefScientistLastname: fieldSample?.chiefScientistLastname ?? undefined,
    hostInstitution: fieldSample?.hostInstitution ?? [],
    collectorUserId:
      fieldSample?.collectorUserId ??
      collectionSpecimen?.collectorUserId ??
      undefined,
    collectorFirstname:
      fieldSample?.collectorFirstname ??
      collectionSpecimen?.collectorFirstname ??
      undefined,
    collectorLastname:
      fieldSample?.collectorLastname ??
      collectionSpecimen?.collectorLastname ??
      undefined,
    funding: fieldSample?.funding ?? undefined,
    researchProgramDescription:
      fieldSample?.researchProgramDescription ?? undefined,
    platformType: fieldSample?.platformType ?? undefined,
    launchPlatformName: fieldSample?.launchPlatformName ?? undefined,
    additionalRoles: (fieldSample?.additionalRoles ?? []).map((row) => ({
      key: crypto.randomUUID(),
      role: row.role,
      personUserId: row.personUserId ?? undefined,
      personFirstname: row.personFirstname ?? undefined,
      personLastname: row.personLastname ?? undefined,
    })),
    collectionCuratorUserId:
      collectionSpecimen?.collectionCuratorUserId ?? undefined,
    collectionCuratorFirstname:
      collectionSpecimen?.collectionCuratorFirstname ?? undefined,
    collectionCuratorLastname:
      collectionSpecimen?.collectionCuratorLastname ?? undefined,
    collectionOrigin: collectionSpecimen?.collectionOrigin ?? undefined,
    collectionContextDescription:
      collectionSpecimen?.collectionContextDescription ?? undefined,
  };
}
