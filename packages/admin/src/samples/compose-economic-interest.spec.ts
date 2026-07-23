import { toHierarchyPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { describe, expect, it } from "vitest";

import {
  composeEconomicInterest,
  type EconomicInterestDraft,
  toEconomicInterestDraft,
} from "./compose-economic-interest.ts";

const draft = (
  over: Partial<EconomicInterestDraft>,
): EconomicInterestDraft => ({
  ...toEconomicInterestDraft(undefined),
  ...over,
});

describe("composeEconomicInterest", () => {
  it("should compose a full mineral_and_ore block", () => {
    expect(
      composeEconomicInterest(
        draft({
          economicInterestPath: toHierarchyPath("yes.mineral_and_ore.uranium"),
          economicInterestElements: ["u", "fe"],
          economicResourceTypePrecision: "high-grade ore",
          economicDepositName: "Cigar Lake",
          economicDepositDescription: "Unconformity-related",
        }),
      ),
    ).toEqual({
      economicInterest: "yes.mineral_and_ore.uranium",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related",
    });
  });

  it("should drop the elements outside mineral_and_ore but keep the detail", () => {
    expect(
      composeEconomicInterest(
        draft({
          economicInterestPath: toHierarchyPath("yes.hydrocarbon.coal"),
          economicInterestElements: ["fe"],
          economicDepositName: "Ruhr",
        }),
      ),
    ).toEqual({
      economicInterest: "yes.hydrocarbon.coal",
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: "Ruhr",
      economicDepositDescription: null,
    });
  });

  it("should drop every detail when the answer is not yes", () => {
    expect(
      composeEconomicInterest(
        draft({
          economicInterestPath: toHierarchyPath("no"),
          economicInterestElements: ["fe"],
          economicDepositName: "Ruhr",
        }),
      ),
    ).toEqual({
      economicInterest: "no",
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: null,
      economicDepositDescription: null,
    });
  });

  it("should drop a blank detail", () => {
    expect(
      composeEconomicInterest(
        draft({
          economicInterestPath: toHierarchyPath("yes"),
          economicDepositName: "   ",
        }),
      ).economicDepositName,
    ).toBeNull();
  });

  it("should map an empty draft to a null answer", () => {
    expect(composeEconomicInterest(draft({}))).toEqual({
      economicInterest: null,
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: null,
      economicDepositDescription: null,
    });
  });
});

describe("toEconomicInterestDraft", () => {
  it("should return an empty draft for no value", () => {
    expect(toEconomicInterestDraft(undefined)).toEqual({
      economicInterestPath: [],
      economicInterestElements: [],
      economicResourceTypePrecision: undefined,
      economicDepositName: undefined,
      economicDepositDescription: undefined,
    });
  });

  it("should round-trip a full block through the draft", () => {
    expect(
      composeEconomicInterest(
        toEconomicInterestDraft({
          economicInterest: "yes.mineral_and_ore.uranium.sandstone",
          economicInterestElements: ["u", "fe"],
          economicResourceTypePrecision: "high-grade ore",
          economicDepositName: "Cigar Lake",
          economicDepositDescription: "Unconformity-related",
        }),
      ),
    ).toEqual({
      economicInterest: "yes.mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related",
    });
  });
});
