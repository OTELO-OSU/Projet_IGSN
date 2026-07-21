import { pathLabelKey } from "../path/label-key.ts";
import { type EconomicInterest } from "./vocabulary.ts";

// The i18n message key for an economic-interest node (see pathLabelKey),
// e.g. `economic_interest_yes`, `economic_interest_mineral_and_ore`.
export function economicInterestLabelKey(path: EconomicInterest): string {
  return pathLabelKey("economic_interest", path);
}
