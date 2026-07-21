import type { CreateSample } from "@projet-igsn/domain/sample/sample";

type EconomicInterestInput = Pick<
  CreateSample,
  | "economicInterest"
  | "economicInterestElements"
  | "economicResourceTypePrecision"
  | "economicDepositName"
  | "economicDepositDescription"
>;

// Domain economic-interest fields -> flat sample columns, shared by insert and
// update so the mapping never drifts. All optional: an absent field writes null,
// so an update clears what the input no longer carries. Elements write null when
// absent or empty (never an empty array), matching the storage_conditions text[]
// column. The yes/no/unknown answer gates the rest: unless the path is under
// `yes`, every detail column is nulled, so the stored state never contradicts a
// `no`/`unknown`/absent answer. Elements go one step further: they describe an
// ore, so they are kept only under a mineral_and_ore resource (see
// element/vocabulary.ts), nulled for the other `yes` branches that still keep
// the free-text detail.
export function economicInterestColumns(input: EconomicInterestInput) {
  const path = input.economicInterest ?? null;
  const enabled = path === "yes" || (path?.startsWith("yes.") ?? false);
  const hasElements = path?.startsWith("yes.mineral_and_ore") ?? false;
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
