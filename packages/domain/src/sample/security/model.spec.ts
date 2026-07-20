import { describe, expect, it } from "vitest";

import { securitySchema } from "./model.ts";

const full = {
  radioactivity: true,
  radioactivityExplanation: "0.5 Bq/g",
  asbestosRich: true,
  asbestosExplanation: "~3% chrysotile",
  chemicalRisk: true,
  chemicalRiskExplanation: "Toxic metals, flammable solvents",
};

describe("securitySchema", () => {
  it("should accept a full security block", () => {
    expect(securitySchema.parse(full)).toEqual(full);
  });

  it("should accept an empty security block (every part is optional)", () => {
    expect(securitySchema.parse({})).toEqual({});
  });

  it.each([
    { radioactivity: true },
    { asbestosRich: false },
    { chemicalRisk: true },
    { radioactivity: false, asbestosRich: false, chemicalRisk: false },
  ])("should accept a flag without its explanation %o", (input) => {
    expect(securitySchema.safeParse(input).success).toBe(true);
  });

  it.each([
    { radioactivity: true, radioactivityExplanation: "0.5 Bq/g" },
    { asbestosRich: true, asbestosExplanation: "~3% chrysotile" },
    { chemicalRisk: true, chemicalRiskExplanation: "Flammable" },
  ])("should accept an explanation when its flag is true %o", (input) => {
    expect(securitySchema.safeParse(input).success).toBe(true);
  });

  it.each([
    { radioactivityExplanation: "0.5 Bq/g" },
    { radioactivity: false, radioactivityExplanation: "0.5 Bq/g" },
    { asbestosExplanation: "~3% chrysotile" },
    { asbestosRich: false, asbestosExplanation: "~3% chrysotile" },
    { chemicalRiskExplanation: "Flammable" },
    { chemicalRisk: false, chemicalRiskExplanation: "Flammable" },
  ])("should reject an explanation when its flag is not true %o", (input) => {
    expect(securitySchema.safeParse(input).success).toBe(false);
  });

  it("should reject a blank explanation", () => {
    const result = securitySchema.safeParse({
      radioactivity: true,
      radioactivityExplanation: "   ",
    });
    expect(result.success).toBe(false);
  });
});
