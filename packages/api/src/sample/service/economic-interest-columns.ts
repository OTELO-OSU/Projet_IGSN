import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";

type EconomicInterestInput = Pick<
  CreateSample,
  | "economicInterest"
  | "economicInterestElements"
  | "economicResourceTypePrecision"
  | "economicDepositName"
  | "economicDepositDescription"
>;

export function economicInterestColumns(input: EconomicInterestInput) {
  const path = input.economicInterest ?? null;
  const enabled = isPathAtOrUnder(path, "yes");
  const hasElements = isPathAtOrUnder(path, "yes.mineral_and_ore");
  const elements = input.economicInterestElements;
  return {
    economic_interest: path,
    economic_interest_elements:
      hasElements && elements?.length ? elements : null,
    economic_resource_type_precision: enabled
      ? (input.economicResourceTypePrecision ?? null)
      : null,
    economic_deposit_name: enabled ? (input.economicDepositName ?? null) : null,
    economic_deposit_description: enabled
      ? (input.economicDepositDescription ?? null)
      : null,
  };
}
