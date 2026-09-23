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
      currentArchiveOsu: "OASU",
      currentArchiveLaboratory: "UMR5805",
      currentArchiveContactFirstname: "Camille",
      currentArchiveContactLastname: "Durand",
      collectionName: "Chaîne des Puys reference collection",
      rightsHolder: ["03fd77x13", "02cte4b68"],
    };
    const created = await insertSample(db, { ...base, repository });
    expect(created.repository).toEqual(repository);
    expect(await readSample(db, created.id)).toEqual(created);
  });

  pgTest("should read back an empty repository as null", async ({ db }) => {
    const created = await insertSample(db, base);
    expect(created.repository).toBeNull();
    expect(await readSample(db, created.id)).toEqual(created);
  });
});
