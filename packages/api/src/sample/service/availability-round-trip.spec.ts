import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Availability sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample availability persistence", () => {
  pgTest("should leave availability null on a new draft", async ({ db }) => {
    const created = await insertSample(db, base);
    expect(created.availability).toBeNull();
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest("should round-trip 'no_longer_exists'", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      availability: "no_longer_exists",
    });
    expect(created.availability).toBe("no_longer_exists");
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest("should update the availability", async ({ db }) => {
    const created = await insertSample(db, base);
    const updated = await updateSample(db, created.id, {
      ...base,
      availability: "no_longer_exists",
    });
    expect(updated?.availability).toBe("no_longer_exists");
    expect(await getSample(db, created.id)).toEqual(updated);
  });
});
