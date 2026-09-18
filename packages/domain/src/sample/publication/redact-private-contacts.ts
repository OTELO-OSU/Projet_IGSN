import type { Sample } from "../sample.ts";

function redactScientificContext(
  context: Sample["scientificContext"],
): Sample["scientificContext"] {
  if (context == null) return context;
  return context.provenanceStatus === "field_sample"
    ? { ...context, chiefScientistUserId: null, collectorUserId: null }
    : { ...context, collectionCuratorUserId: null, collectorUserId: null };
}

export function redactPrivateContacts(sample: Sample): Sample {
  return {
    ...sample,
    repository: sample.repository && {
      ...sample.repository,
      currentArchiveContactFirstname: null,
      currentArchiveContactLastname: null,
      originalArchiveContactFirstname: null,
      originalArchiveContactLastname: null,
    },
    scientificContext: redactScientificContext(sample.scientificContext),
    syntheticDetails: sample.syntheticDetails && {
      ...sample.syntheticDetails,
      operatorUserId: null,
    },
  };
}
