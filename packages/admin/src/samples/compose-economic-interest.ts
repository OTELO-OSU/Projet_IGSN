import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { type CreateSample } from "@projet-igsn/domain/sample/sample";

export type EconomicInterestDraft = {
  economicInterestPath: string[];
  economicInterestElements: string[];
  economicResourceTypePrecision: string | null | undefined;
  economicDepositName: string | null | undefined;
  economicDepositDescription: string | null | undefined;
};

type EconomicInterestValue = Pick<
  CreateSample,
  | "economicInterest"
  | "economicInterestElements"
  | "economicResourceTypePrecision"
  | "economicDepositName"
  | "economicDepositDescription"
>;

type EconomicInterestComposed = {
  economicInterest: string | null;
  economicInterestElements: string[];
  economicResourceTypePrecision: string | null;
  economicDepositName: string | null;
  economicDepositDescription: string | null;
};

export function composeEconomicInterest(
  draft: EconomicInterestDraft,
): EconomicInterestComposed {
  const economicInterest = composeHierarchyValue(draft.economicInterestPath);
  const detail = (value: string | null | undefined): string | null =>
    isPathAtOrUnder(economicInterest, "yes") ? value?.trim() || null : null;
  return {
    economicInterest,
    economicInterestElements: isPathAtOrUnder(
      economicInterest,
      "yes.mineral_and_ore",
    )
      ? draft.economicInterestElements
      : [],
    economicResourceTypePrecision: detail(draft.economicResourceTypePrecision),
    economicDepositName: detail(draft.economicDepositName),
    economicDepositDescription: detail(draft.economicDepositDescription),
  };
}

export function toEconomicInterestDraft(
  value?: EconomicInterestValue,
): EconomicInterestDraft {
  return {
    economicInterestPath: toHierarchyPath(value?.economicInterest ?? null),
    economicInterestElements: value?.economicInterestElements ?? [],
    economicResourceTypePrecision: value?.economicResourceTypePrecision,
    economicDepositName: value?.economicDepositName,
    economicDepositDescription: value?.economicDepositDescription,
  };
}
