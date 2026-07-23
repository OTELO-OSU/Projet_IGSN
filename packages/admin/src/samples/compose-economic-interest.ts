import {
  composeHierarchyValue,
  toHierarchyPath,
} from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { type CreateSample } from "@projet-igsn/domain/sample/sample";

// The Economic interest section's flat form draft. The answer is a hierarchy
// path (yes/no/unknown, then the resource classification under `yes`), held per
// level like materialPath; the chemical elements and the free-text detail sit
// alongside it. Fields hold their value or nullish when unset.
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

// A `yes` answer (bare or refined) is the only one that carries detail; the
// chemical elements need a mineral_and_ore resource on top of that.
const isYes = (path: string | null): boolean =>
  path === "yes" || (path?.startsWith("yes.") ?? false);
const isMineralOre = (path: string | null): boolean =>
  path === "yes.mineral_and_ore" ||
  (path?.startsWith("yes.mineral_and_ore.") ?? false);

type EconomicInterestComposed = {
  economicInterest: string | null;
  economicInterestElements: string[];
  economicResourceTypePrecision: string | null;
  economicDepositName: string | null;
  economicDepositDescription: string | null;
};

// The economic-interest fields composed from the draft, spread flat into the
// CreateSample. Detail is dropped unless the answer is a `yes` path and the
// elements unless it is under mineral_and_ore, mirroring the API's
// economic-interest-columns: a value the current answer hides is never
// submitted (ADR 0015) and the stored state cannot contradict the answer.
export function composeEconomicInterest(
  draft: EconomicInterestDraft,
): EconomicInterestComposed {
  const economicInterest = composeHierarchyValue(draft.economicInterestPath);
  const detail = (value: string | null | undefined): string | null =>
    isYes(economicInterest) ? value?.trim() || null : null;
  return {
    economicInterest,
    economicInterestElements: isMineralOre(economicInterest)
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
