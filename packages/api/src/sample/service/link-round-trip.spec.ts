import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamples } from "./list-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Linked sample",
  nature: "hand_sample" as const,
  type: null,
};

describe("sample links persistence", () => {
  pgTest("should round-trip links in entry order", async ({ db }) => {
    const links = [
      { url: "https://doi.org/10.1594/IEDA.100252", description: null },
      {
        url: "https://doi.org/10.5880/GFZ.2026.001",
        description: "Companion dataset",
      },
    ];
    const created = await insertSample(db, { ...base, links });
    expect(created.links).toMatchObject(links);
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest("should create a sample without links", async ({ db }) => {
    const created = await insertSample(db, base);
    expect(created.links).toEqual([]);
  });

  pgTest("should replace the links wholesale on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      links: [
        { url: "https://doi.org/10.1594/IEDA.100252", description: "Old" },
      ],
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      links: [
        { url: "https://doi.org/10.5880/GFZ.2026.001", description: null },
      ],
    });
    expect(updated?.links).toMatchObject([
      { url: "https://doi.org/10.5880/GFZ.2026.001", description: null },
    ]);
  });

  pgTest(
    "should clear the links when the update carries none",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        links: [
          { url: "https://doi.org/10.1594/IEDA.100252", description: null },
        ],
      });
      const updated = await updateSample(db, created.id, base);
      expect(updated?.links).toEqual([]);
      expect((await getSample(db, created.id))?.links).toEqual([]);
    },
  );

  pgTest("should list each sample with its own links", async ({ db }) => {
    const first = await insertSample(db, {
      ...base,
      name: "First",
      links: [
        { url: "https://doi.org/10.1594/IEDA.100252", description: null },
      ],
    });
    const second = await insertSample(db, { ...base, name: "Second" });
    const { data } = await listSamples(db, { page: 1, perPage: 10 });
    const byId = new Map(data.map((sample) => [sample.id, sample]));
    expect(byId.get(first.id)?.links).toMatchObject([
      { url: "https://doi.org/10.1594/IEDA.100252" },
    ]);
    expect(byId.get(second.id)?.links).toEqual([]);
  });
});
