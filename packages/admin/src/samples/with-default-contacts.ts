import type { SampleDraft } from "#/samples/sample-draft-schema.ts";

export function withDefaultContacts(
  draft: SampleDraft,
  userId: string | undefined,
): SampleDraft {
  const { syntheticDetails, scientificContext } = draft;
  return {
    ...draft,
    syntheticDetails:
      syntheticDetails.operatorUserId ||
      syntheticDetails.operatorFirstname ||
      syntheticDetails.operatorLastname
        ? syntheticDetails
        : { ...syntheticDetails, operatorUserId: userId },
    scientificContext:
      scientificContext.collectorUserId ||
      scientificContext.collectorFirstname ||
      scientificContext.collectorLastname
        ? scientificContext
        : { ...scientificContext, collectorUserId: userId },
  };
}
