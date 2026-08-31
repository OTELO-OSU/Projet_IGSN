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
  it.each([
    ["an ineligible material", "fossil"],
    ["no material", null],
  ])("should send no economic block for %s", (_case, material) => {
    expect(
      composeEconomicInterest(
        draft({
          resourceTypePath: toHierarchyPath("mineral_and_ore"),
          economicInterestElements: ["fe"],
          economicResourceTypePrecision: "high-grade ore",
          economicDepositName: "Ruhr",
          economicDepositDescription: "Coal basin",
        }),
        material,
      ),
    ).toBeNull();
  });

  it("should send no economic block when nothing is entered", () => {
    expect(composeEconomicInterest(draft({}), "sediment")).toBeNull();
  });

  it("should keep the detail when no resource type is chosen", () => {
    expect(
      composeEconomicInterest(
        draft({ economicDepositName: "Ruhr" }),
        "sediment",
      ),
    ).toEqual({
      resourceType: null,
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: "Ruhr",
      economicDepositDescription: null,
    });
  });

  it("should drop the elements outside mineral_and_ore but keep the detail", () => {
    expect(
      composeEconomicInterest(
        draft({
          resourceTypePath: toHierarchyPath("hydrocarbon.coal"),
          economicInterestElements: ["fe"],
          economicDepositName: "Ruhr",
        }),
        "sediment",
      ),
    ).toEqual({
      resourceType: "hydrocarbon.coal",
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: "Ruhr",
      economicDepositDescription: null,
    });
  });

  it("should drop a blank detail", () => {
    expect(
      composeEconomicInterest(
        draft({
          resourceTypePath: toHierarchyPath("hydrocarbon"),
          economicDepositName: "   ",
        }),
        "sediment",
      )?.economicDepositName,
    ).toBeNull();
  });
});

describe("toEconomicInterestDraft", () => {
  it("should return an empty draft for no value", () => {
    expect(toEconomicInterestDraft(undefined)).toEqual({
      resourceTypePath: [],
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
          resourceType: "mineral_and_ore.uranium.sandstone",
          economicInterestElements: ["u", "fe"],
          economicResourceTypePrecision: "high-grade ore",
          economicDepositName: "Cigar Lake",
          economicDepositDescription: "Unconformity-related",
        }),
        "rock.sedimentary",
      ),
    ).toEqual({
      resourceType: "mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related",
    });
  });
});
