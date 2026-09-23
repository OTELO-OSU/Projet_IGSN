import type { Sample } from "../sample.ts";

import { redactPrivateContacts } from "./redact-private-contacts.ts";

const USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

const sample = {
  name: "Rhyolite 11",
  repository: {
    currentArchiveOsu: "OMP",
    currentArchiveLaboratory: "UMR3589",
    currentArchiveContactFirstname: "Ada",
    currentArchiveContactLastname: "Lovelace",
    collectionName: "Historic basalts",
    rightsHolder: ["03fd77x13"],
  },
  scientificContext: null,
  syntheticDetails: null,
} as Sample;

describe("redactPrivateContacts", () => {
  it("should drop the current archive contact names and keep the rest of the repository", () => {
    expect(redactPrivateContacts(sample)).toEqual({
      name: "Rhyolite 11",
      repository: {
        currentArchiveOsu: "OMP",
        currentArchiveLaboratory: "UMR3589",
        currentArchiveContactFirstname: null,
        currentArchiveContactLastname: null,
        collectionName: "Historic basalts",
        rightsHolder: ["03fd77x13"],
      },
      scientificContext: null,
      syntheticDetails: null,
    });
  });

  it("should drop the account link of every person, nested rows included", () => {
    const linked = {
      ...sample,
      repository: null,
      scientificContext: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: USER_ID,
        collectorUserId: USER_ID,
        launchPlatformName: "RV Marion Dufresne",
        additionalRoles: [
          { role: "researcher", personUserId: USER_ID },
          { role: "data_manager", personLastname: "Curie" },
        ],
      },
      syntheticDetails: { operatorUserId: USER_ID, finalProduct: "glass" },
    } as Sample;

    expect(redactPrivateContacts(linked)).toEqual({
      name: "Rhyolite 11",
      repository: null,
      scientificContext: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: null,
        collectorUserId: null,
        launchPlatformName: "RV Marion Dufresne",
        additionalRoles: [
          { role: "researcher", personUserId: null },
          { role: "data_manager", personLastname: "Curie" },
        ],
      },
      syntheticDetails: { operatorUserId: null, finalProduct: "glass" },
    });
  });
});
