import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Security sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample security persistence", () => {
  pgTest("should round-trip a full security block", async ({ db }) => {
    const security = {
      radioactivity: true,
      radioactivityExplanation: "0.5 Bq/g",
      asbestosRich: true,
      asbestosExplanation: "~3% chrysotile",
      chemicalRisk: true,
      chemicalRiskExplanation: "Toxic metals, flammable solvents",
    };
    const created = await insertSample(db, { ...base, security });
    expect(created.security).toEqual(security);
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should round-trip a hazard flagged false without an explanation",
    async ({ db }) => {
      const security = {
        radioactivity: false,
        asbestosRich: false,
        chemicalRisk: false,
      };
      const created = await insertSample(db, { ...base, security });
      expect(created.security).toEqual(security);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return a null security when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.security).toBeNull();
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should clear security on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      security: { chemicalRisk: true, chemicalRiskExplanation: "Flammable" },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      security: null,
    });
    expect(updated?.security).toBeNull();
    expect(await getSample(db, created.id)).toEqual(updated);
  });
});
