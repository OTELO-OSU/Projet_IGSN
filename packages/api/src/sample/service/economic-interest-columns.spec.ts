import { describe, expect, it } from "vitest";

import { economicInterestColumns } from "./economic-interest-columns.ts";

describe("economicInterestColumns", () => {
  it("should keep elements and detail under a mineral_and_ore path", () => {
    expect(
      economicInterestColumns({
        economicInterest: "yes.mineral_and_ore.uranium",
        economicInterestElements: ["u", "fe"],
        economicResourceTypePrecision: "high-grade ore",
        economicDepositName: "Cigar Lake",
        economicDepositDescription: "Unconformity-related",
      }),
    ).toEqual({
      economic_interest: "yes.mineral_and_ore.uranium",
      economic_interest_elements: ["u", "fe"],
      economic_resource_type_precision: "high-grade ore",
      economic_deposit_name: "Cigar Lake",
      economic_deposit_description: "Unconformity-related",
    });
  });

  it("should null elements but keep detail for a yes answer outside mineral_and_ore", () => {
    expect(
      economicInterestColumns({
        economicInterest: "yes.hydrocarbon.coal",
        economicInterestElements: ["fe"],
        economicDepositName: "Ruhr",
      }),
    ).toEqual({
      economic_interest: "yes.hydrocarbon.coal",
      economic_interest_elements: null,
      economic_resource_type_precision: null,
      economic_deposit_name: "Ruhr",
      economic_deposit_description: null,
    });
  });

  it("should null every detail when the answer is not yes", () => {
    expect(
      economicInterestColumns({
        economicInterest: "no",
        economicInterestElements: ["fe"],
        economicDepositName: "Ruhr",
      }),
    ).toEqual({
      economic_interest: "no",
      economic_interest_elements: null,
      economic_resource_type_precision: null,
      economic_deposit_name: null,
      economic_deposit_description: null,
    });
  });

  it("should null an empty element selection even under mineral_and_ore", () => {
    expect(
      economicInterestColumns({
        economicInterest: "yes.mineral_and_ore",
        economicInterestElements: [],
      }).economic_interest_elements,
    ).toBeNull();
  });

  it("should map an absent economic interest to all nulls", () => {
    expect(economicInterestColumns({})).toEqual({
      economic_interest: null,
      economic_interest_elements: null,
      economic_resource_type_precision: null,
      economic_deposit_name: null,
      economic_deposit_description: null,
    });
  });
});
