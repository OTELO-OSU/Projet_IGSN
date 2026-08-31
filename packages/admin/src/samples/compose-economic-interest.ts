import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { allowsResourceType } from "@projet-igsn/domain/sample/resource-type/allows-resource-type";
import { allowsResourceTypeElements } from "@projet-igsn/domain/sample/resource-type/allows-resource-type-elements";
import { hasEconomicInterest } from "@projet-igsn/domain/sample/resource-type/has-economic-interest";
import { type CreateSample } from "@projet-igsn/domain/sample/sample";

export type EconomicInterestDraft = {
  resourceTypePath: string[];
  economicInterestElements: string[];
  economicResourceTypePrecision: string | null | undefined;
  economicDepositName: string | null | undefined;
  economicDepositDescription: string | null | undefined;
};

type EconomicInterestValue = Pick<
  CreateSample,
  | "resourceType"
  | "economicInterestElements"
  | "economicResourceTypePrecision"
  | "economicDepositName"
  | "economicDepositDescription"
>;

type EconomicInterestComposed = {
  resourceType: string | null;
  economicInterestElements: string[];
  economicResourceTypePrecision: string | null;
  economicDepositName: string | null;
  economicDepositDescription: string | null;
};

export function composeEconomicInterest(
  draft: EconomicInterestDraft,
  material: string | null,
): EconomicInterestComposed | null {
  if (!allowsResourceType(material)) return null;
  const resourceType = composeHierarchyValue(draft.resourceTypePath);
  const composed = {
    resourceType,
    economicInterestElements: allowsResourceTypeElements(resourceType)
      ? draft.economicInterestElements
      : [],
    economicResourceTypePrecision:
      draft.economicResourceTypePrecision?.trim() || null,
    economicDepositName: draft.economicDepositName?.trim() || null,
    economicDepositDescription:
      draft.economicDepositDescription?.trim() || null,
  };
  return hasEconomicInterest(composed) ? composed : null;
}

export function toEconomicInterestDraft(
  value?: EconomicInterestValue,
): EconomicInterestDraft {
  return {
    resourceTypePath: toHierarchyPath(value?.resourceType ?? null),
    economicInterestElements: value?.economicInterestElements ?? [],
    economicResourceTypePrecision: value?.economicResourceTypePrecision,
    economicDepositName: value?.economicDepositName,
    economicDepositDescription: value?.economicDepositDescription,
  };
}
