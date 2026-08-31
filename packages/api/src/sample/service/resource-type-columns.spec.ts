import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect, it } from "vitest";

import { resourceTypeColumns } from "./resource-type-columns.ts";

const ELIGIBLE_MATERIAL = "rock.igneous.plutonic.felsic.granite";

describe("resourceTypeColumns", () => {
  it("should keep the resource type, its elements and the details for an eligible material", () => {
    expect(
      resourceTypeColumns({
        material: ELIGIBLE_MATERIAL,
        resourceType: "mineral_and_ore.uranium",
        economicInterestElements: ["u", "fe"],
        economicResourceTypePrecision: "high-grade ore",
        economicDepositName: "Cigar Lake",
        economicDepositDescription: "Unconformity-related",
      }),
    ).toEqual({
      resource_type: "mineral_and_ore.uranium",
      economic_interest_elements: ["u", "fe"],
      economic_resource_type_precision: "high-grade ore",
      economic_deposit_name: "Cigar Lake",
      economic_deposit_description: "Unconformity-related",
    });
  });

  it("should keep the details of an eligible material with no resource type", () => {
    expect(
      resourceTypeColumns({
        material: ELIGIBLE_MATERIAL,
        economicResourceTypePrecision: "high-grade ore",
        economicDepositName: "Cigar Lake",
        economicDepositDescription: "Unconformity-related",
      }),
    ).toEqual({
      resource_type: null,
      economic_interest_elements: null,
      economic_resource_type_precision: "high-grade ore",
      economic_deposit_name: "Cigar Lake",
      economic_deposit_description: "Unconformity-related",
    });
  });

  it.each([undefined, "mineral"])(
    "should null every resource type column for the ineligible material %s",
    (material) => {
      expect(
        resourceTypeColumns({
          material,
          resourceType: "mineral_and_ore.uranium",
          economicInterestElements: ["fe"],
          economicResourceTypePrecision: "high-grade ore",
          economicDepositName: "Ruhr",
          economicDepositDescription: "Coal basin",
        }),
      ).toEqual({
        resource_type: null,
        economic_interest_elements: null,
        economic_resource_type_precision: null,
        economic_deposit_name: null,
        economic_deposit_description: null,
      });
    },
  );

  it.each<Pick<CreateSample, "resourceType" | "economicInterestElements">>([
    { resourceType: "hydrocarbon.coal", economicInterestElements: ["fe"] },
    { resourceType: "mineral_and_ore.uranium", economicInterestElements: [] },
  ])(
    "should null the elements for $resourceType with $economicInterestElements",
    (input) => {
      expect(
        resourceTypeColumns({ material: ELIGIBLE_MATERIAL, ...input })
          .economic_interest_elements,
      ).toBeNull();
    },
  );
});
