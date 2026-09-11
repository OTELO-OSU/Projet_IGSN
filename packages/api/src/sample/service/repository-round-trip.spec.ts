import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";

const base = {
  name: "Repository sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample repository persistence", () => {
  pgTest("should round-trip a full repository section", async ({ db }) => {
    const repository = {
      currentArchive: "02feahw73",
      currentArchiveContactFirstname: "Camille",
      currentArchiveContactLastname: "Durand",
      collectionName: "Chaîne des Puys reference collection",
      originalArchive: "Muséum national d'Histoire naturelle",
      originalArchiveContactFirstname: "Louise",
      originalArchiveContactLastname: "Mercier",
    };
    const created = await insertSample(db, { ...base, repository });
    expect(created.repository).toEqual(repository);
    expect(await readSample(db, created.id)).toEqual(created);
  });
});
