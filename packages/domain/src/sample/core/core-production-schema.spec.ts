import { describe, expect, it } from "vitest";

import {
  coreProcessStepSchema,
  coreProductionSchema,
} from "./core-production-schema.ts";
import { RESEARCH_PROJECT_SAMPLE_RECORD } from "./core-record-fixture.ts";

describe("coreProcessStepSchema", () => {
  it("should reject an hour precision timestamp without a time zone", () => {
    const result = coreProcessStepSchema.safeParse({
      stepType: "Synthesis",
      timestampStart: "2025-01-10T09:00",
      timestampEnd: "2025-01-12T17:30",
      timestampPrecision: "hour",
    });

    expect(result.error?.issues).toMatchObject([
      { path: ["timestampTimeZone"] },
    ]);
  });
});

describe("coreProductionSchema", () => {
  const { production } = RESEARCH_PROJECT_SAMPLE_RECORD;
  const project = production.projects?.[0];

  it.each([
    [
      "a campaign beside a name",
      { projects: [{ ...project, campaign: "MD-218" }] },
      ["projects", 0, "campaign"],
    ],
    [
      "a field beside a name",
      { samplingSite_name: "Vosges" },
      ["samplingSite_name"],
    ],
    [
      "a mission beside a name",
      { samplingPurpose: "Mapping" },
      ["samplingPurpose"],
    ],
    [
      "a mission beside a campaign",
      {
        projects: [{ ...project, name: undefined, campaign: "MD-218" }],
        samplingPurpose: "Mapping",
      },
      ["samplingPurpose"],
    ],
  ])("should refuse %s, on the extra slot", (_case, slots, path) => {
    const result = coreProductionSchema.safeParse({ ...production, ...slots });

    expect(result.error?.issues).toMatchObject([{ code: "custom", path }]);
  });
});
