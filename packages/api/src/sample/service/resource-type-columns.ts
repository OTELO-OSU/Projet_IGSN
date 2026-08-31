import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { allowsResourceType } from "@projet-igsn/domain/sample/resource-type/allows-resource-type";
import { allowsResourceTypeElements } from "@projet-igsn/domain/sample/resource-type/allows-resource-type-elements";

type ResourceTypeInput = Pick<
  CreateSample,
  | "material"
  | "resourceType"
  | "economicInterestElements"
  | "economicResourceTypePrecision"
  | "economicDepositName"
  | "economicDepositDescription"
>;

const NO_RESOURCE_TYPE = {
  resource_type: null,
  economic_interest_elements: null,
  economic_resource_type_precision: null,
  economic_deposit_name: null,
  economic_deposit_description: null,
};

export function resourceTypeColumns(input: ResourceTypeInput) {
  if (!allowsResourceType(input.material)) return NO_RESOURCE_TYPE;
  const path = input.resourceType ?? null;
  const elements = input.economicInterestElements;
  return {
    resource_type: path,
    economic_interest_elements:
      allowsResourceTypeElements(path) && elements?.length ? elements : null,
    economic_resource_type_precision:
      input.economicResourceTypePrecision ?? null,
    economic_deposit_name: input.economicDepositName ?? null,
    economic_deposit_description: input.economicDepositDescription ?? null,
  };
}
