import { describe, expect, it } from "vitest";

import { syntheticDetailsSchema } from "./model.ts";

const syntheticDetails = {
  startingMaterialNature: "synthetic",
  startingMaterialForm: "powder",
  startingMaterialComposition: "SiO2 + Al2O3",
  finalProduct: "glass",
  experimentType: "fusion",
  experimentDuration: { value: 30, unit: "minute" },
  experimentDurationNotRelevant: false,
  synthesisDate: { start: "2020-01-01", end: "2020-01-02" },
  operatorName: "Marie Curie",
  operatorOrcid: "0000-0002-1825-0097",
  researchStructure: ["04kdfz702", "02feahw73"],
  temperature: { value: -20, unit: "celsius" },
  pressure: { value: 2, unit: "gpa" },
  experimentalProtocol: "Piston cylinder run",
  experimentPurpose: "Phase relations",
  equipmentUsed: "Piston cylinder press",
};

describe("syntheticDetailsSchema", () => {
  it("should accept a full synthesis description, sub-zero temperature included", () => {
    expect(syntheticDetailsSchema.parse(syntheticDetails)).toEqual(
      syntheticDetails,
    );
  });

  it("should accept an empty section, since a half-filled draft must save", () => {
    expect(syntheticDetailsSchema.parse({})).toEqual({});
  });

  it("should reject a synthesis period ending before it starts", () => {
    const result = syntheticDetailsSchema.safeParse({
      synthesisDate: { start: "2020-01-02", end: "2020-01-01" },
    });

    expect(result.error?.issues).toMatchObject([
      { params: { code: "synthesis_date_order" } },
    ]);
  });

  it("should reject a synthesis date in the future", () => {
    const result = syntheticDetailsSchema.safeParse({
      synthesisDate: { start: "2999-01-01", end: "2999-01-02" },
    });

    expect(result.error?.issues).toMatchObject([
      { params: { code: "synthesis_date_future" } },
      { params: { code: "synthesis_date_future" } },
    ]);
  });

  it("should reject a research structure listed twice", () => {
    const result = syntheticDetailsSchema.safeParse({
      researchStructure: ["04kdfz702", "04kdfz702"],
    });

    expect(result.error?.issues).toMatchObject([
      { params: { code: "synthetic_research_structure_duplicate" } },
    ]);
  });
});
