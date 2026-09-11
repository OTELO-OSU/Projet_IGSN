import type { Sample } from "../sample.ts";

import { redactArchiveContacts } from "./redact-archive-contacts.ts";

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
} as Sample;

describe("redactArchiveContacts", () => {
  it("should drop both archive contact names and keep the rest of the repository", () => {
    expect(redactArchiveContacts(sample)).toEqual({
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
    });
  });

  it("should leave a sample without a repository untouched", () => {
    const withoutRepository = {
      name: "Rhyolite 11",
      repository: null,
    } as Sample;

    expect(redactArchiveContacts(withoutRepository)).toBe(withoutRepository);
  });
});
