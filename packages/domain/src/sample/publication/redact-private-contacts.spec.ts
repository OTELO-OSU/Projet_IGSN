import type { Sample } from "../sample.ts";

import { redactPrivateContacts } from "./redact-private-contacts.ts";

const USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

const sample = {
  name: "Rhyolite 11",
  repository: {
    currentArchive: "03fd77x13",
    currentArchiveContactFirstname: "Ada",
    currentArchiveContactLastname: "Lovelace",
    collectionName: "Historic basalts",
    originalArchive: "Museum of Nancy",
    originalArchiveContactFirstname: "Marie",
    originalArchiveContactLastname: "Curie",
  },
  scientificContext: null,
  syntheticDetails: null,
} as Sample;

describe("redactPrivateContacts", () => {
  it("should drop both archive contact names and keep the rest of the repository", () => {
    expect(redactPrivateContacts(sample)).toEqual({
      name: "Rhyolite 11",
      repository: {
        currentArchive: "03fd77x13",
        currentArchiveContactFirstname: null,
        currentArchiveContactLastname: null,
        collectionName: "Historic basalts",
        originalArchive: "Museum of Nancy",
        originalArchiveContactFirstname: null,
        originalArchiveContactLastname: null,
      },
      scientificContext: null,
      syntheticDetails: null,
    });
  });

  it.each([
    {
      case: "a field sample",
      scientificContext: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: USER_ID,
        collectorUserId: USER_ID,
        fieldName: "Site A",
      },
      redacted: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: null,
        collectorUserId: null,
        fieldName: "Site A",
      },
    },
    {
      case: "a collection specimen",
      scientificContext: {
        provenanceStatus: "collection_specimen",
        collectionCuratorUserId: USER_ID,
        collectorUserId: USER_ID,
        collectionOrigin: "purchase",
      },
      redacted: {
        provenanceStatus: "collection_specimen",
        collectionCuratorUserId: null,
        collectorUserId: null,
        collectionOrigin: "purchase",
      },
    },
  ])(
    "should drop the account link of every person of $case",
    ({ scientificContext, redacted }) => {
      const linked = {
        ...sample,
        repository: null,
        scientificContext,
        syntheticDetails: { operatorUserId: USER_ID, finalProduct: "glass" },
      } as Sample;

      expect(redactPrivateContacts(linked)).toEqual({
        name: "Rhyolite 11",
        repository: null,
        scientificContext: redacted,
        syntheticDetails: { operatorUserId: null, finalProduct: "glass" },
      });
    },
  );
});
