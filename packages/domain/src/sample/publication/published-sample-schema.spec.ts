import { describe, expect, it } from "vitest";

import {
  publishedEditSchema,
  publishedSampleSchema,
} from "./published-sample-schema.ts";

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
    collectionOrigin: "scientific_expedition" as const,
  },
};

const missingCollectorFirstname = {
  provenanceStatus: "research_project_sample" as const,
  collectorLastname: "Curie",
};

function blockerIssuesOf(
  result: ReturnType<typeof publishedSampleSchema.safeParse>,
) {
  if (result.success) throw new Error("expected the parse to fail");
  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    code: (issue as { params?: { code?: string } }).params?.code,
  }));
}

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
        scientificContext: missingCollectorFirstname,
      },
      "scientificContext.collectorFirstname",
    ],
  ])(
    "should reject an update that raises %s, pinned on its field",
    (blocker, payload, path) => {
      expect(blockerIssuesOf(publishedSampleSchema.safeParse(payload))).toEqual(
        [{ path, code: blocker }],
      );
    },
  );
});

describe("publishedEditSchema", () => {
  it("should tolerate a blocker the stored sample already had", () => {
    const payload = {
      ...publishable,
      scientificContext: missingCollectorFirstname,
    };
    expect(
      publishedEditSchema(["collector_firstname_missing"]).safeParse(payload)
        .success,
    ).toBe(true);
  });

  it("should still reject a blocker the edit introduces, pinned on its field", () => {
    const payload = {
      ...publishable,
      material: "rock_and_sediment.rock",
      scientificContext: missingCollectorFirstname,
    };
    expect(
      blockerIssuesOf(
        publishedEditSchema(["collector_firstname_missing"]).safeParse(payload),
      ),
    ).toEqual([{ path: "material", code: "material_incomplete" }]);
  });
});
