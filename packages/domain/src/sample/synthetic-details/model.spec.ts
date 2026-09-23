import { describe, expect, it } from "vitest";

import {
  createSyntheticDetailsSchema,
  syntheticDetailsSchema,
} from "./model.ts";

const syntheticDetails = {
  startingMaterial: "synthetic",
  startingMaterialNature: "powder",
  startingMaterialComposition: "SiO2 + Al2O3",
  finalProduct: "glass",
  experimentType: "fusion",
  experimentDuration: { value: 30, unit: "minute" },
  synthesisDate: {
    precision: "hour",
    start: "2020-01-01T09:00",
    end: "2020-01-02T18:30",
    timeZone: "Europe/Paris",
  },
  operatorFirstname: "Marie",
  operatorLastname: "Curie",
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
      synthesisDate: {
        precision: "day",
        start: "2020-01-02",
        end: "2020-01-01",
      },
    });

    expect(result.error?.issues).toMatchObject([
      { params: { code: "synthesis_date_order" } },
    ]);
  });

  it("should reject a synthesis date in the future", () => {
    const result = syntheticDetailsSchema.safeParse({
      synthesisDate: {
        precision: "day",
        start: "2999-01-01",
        end: "2999-01-02",
      },
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

const USER_ID = "b7b3e4c2-1f9a-4a4f-9c3e-2d1f7a5c8e10";

describe("an operator is a link or a typed name, never both", () => {
  it("should reject a linked operator carrying a typed name", () => {
    expect(
      createSyntheticDetailsSchema.safeParse({
        operatorUserId: USER_ID,
        operatorFirstname: "Marie",
      }).success,
    ).toBe(false);
  });

  it("should accept a linked operator with no typed name", () => {
    expect(
      createSyntheticDetailsSchema.parse({ operatorUserId: USER_ID }),
    ).toEqual({
      operatorUserId: USER_ID,
    });
  });

  it("should drop a submitted operator ORCID, since an ORCID comes from the linked account alone", () => {
    expect(
      createSyntheticDetailsSchema.parse({
        operatorLastname: "Curie",
        operatorOrcid: "0000-0002-1825-0097",
      }),
    ).toEqual({ operatorLastname: "Curie" });
  });
});
