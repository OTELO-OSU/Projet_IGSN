import { describe, expect, it } from "vitest";

import { publishedSampleSchema } from "./published-sample-schema.ts";

const publishable = {
  name: "Basalt 42",
  nature: "hand_sample" as const,
  type: "individual_sample",
  material: "rock_and_sediment.sediment.exogenous_detritic.clay",
  location: { position: { type: "point" as const, longitude: 0, latitude: 0 } },
  description: {
    collectionDate: {
      precision: "day",
      start: "2026-01-01",
      end: "2026-01-01",
    },
  },
  repository: { currentArchiveLaboratory: "UMR3589" },
  existenceStatus: "exists" as const,
  availabilityStatus: "available" as const,
  scientificContext: {
    provenanceStatus: "collection_specimen" as const,
    collectionCuratorFirstname: "Georges",
    collectionCuratorLastname: "Cuvier",
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
    [
      "material_incomplete",
      { ...publishable, material: "rock_and_sediment.rock" },
      "material",
    ],
    [
      "collector_firstname_missing",
      {
        ...publishable,
        scientificContext: {
          provenanceStatus: "field_sample" as const,
          collectorLastname: "Curie",
        },
      },
      "scientificContext.collectorFirstname",
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
});
