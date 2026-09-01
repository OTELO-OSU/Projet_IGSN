import type { Sample } from "../sample.ts";

import { redactArchiveContacts } from "./redact-archive-contacts.ts";

const sample = {
  name: "Rhyolite 11",
  repository: {
    currentArchive: "03fd77x13",
    currentArchiveContact: "archivist@example.org",
    collectionName: "Historic basalts",
    originalArchive: "Museum of Nancy",
    originalArchiveContact: "museum@example.org",
  },
} as Sample;

describe("redactArchiveContacts", () => {
  it("should drop both archive contacts and keep the rest of the repository", () => {
    expect(redactArchiveContacts(sample)).toEqual({
      name: "Rhyolite 11",
      repository: {
        currentArchive: "03fd77x13",
        currentArchiveContact: null,
        collectionName: "Historic basalts",
        originalArchive: "Museum of Nancy",
        originalArchiveContact: null,
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
