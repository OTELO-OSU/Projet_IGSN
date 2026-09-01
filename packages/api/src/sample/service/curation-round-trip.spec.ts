import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";

const base = {
  name: "Curation sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample curation status persistence", () => {
  pgTest(
    "should leave both curation statuses null on a new draft",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.existenceStatus).toBeNull();
      expect(created.availabilityStatus).toBeNull();
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should round-trip both curation statuses", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      existenceStatus: "lost",
      availabilityStatus: "not_available",
    });
    expect(created.existenceStatus).toBe("lost");
    expect(created.availabilityStatus).toBe("not_available");
    expect(await readSample(db, created.id)).toEqual(created);
  });
});
