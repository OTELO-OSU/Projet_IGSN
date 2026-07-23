import { describe, expect, it } from "vitest";

import { publishedSampleSchema } from "./published-sample-schema.ts";

// A payload that keeps the sample publishable (no blockers).
const publishable = {
  name: "Basalt 42",
  nature: "hand_sample" as const,
  type: "individual_sample",
  material: "sediment.exogenous_detritic.clay",
  location: { position: { type: "point" as const, longitude: 0, latitude: 0 } },
  description: { collectionDate: { start: "2026-01-01", end: "2026-01-01" } },
  availability: "exists" as const,
  scientificContext: {
    provenanceStatus: "historical_specimen" as const,
    collectionCurator: "Georges Cuvier",
    collectionOrigin: "scientific_expedition" as const,
  },
};

describe("publishedSampleSchema", () => {
  it("should accept an update that keeps the sample publishable", () => {
    expect(publishedSampleSchema.safeParse(publishable).success).toBe(true);
  });

  it.each([
    [
      "collection_date_missing",
      { ...publishable, description: null },
      "description.collectionDate",
    ],
    ["material_missing", { ...publishable, material: null }, "material"],
    ["material_incomplete", { ...publishable, material: "rock" }, "material"],
    ["type_missing", { ...publishable, type: null }, "type"],
    [
      "location_position_missing",
      { ...publishable, location: null },
      "location",
    ],
  ])(
    "should reject an update that raises %s, pinned on its field",
    (blocker, payload, path) => {
      const result = publishedSampleSchema.safeParse(payload);
      if (result.success) throw new Error("expected the parse to fail");
      expect(
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: (issue as { params?: { code?: string } }).params?.code,
        })),
      ).toEqual([{ path, code: blocker }]);
    },
  );

  it("should still reject what createSampleSchema rejects", () => {
    const result = publishedSampleSchema.safeParse({
      ...publishable,
      name: "",
    });
    expect(result.success).toBe(false);
  });
});
