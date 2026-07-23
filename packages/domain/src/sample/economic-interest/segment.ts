import { pathSegment } from "../path/segment.ts";
import {
  type EconomicInterest,
  type EconomicInterestSegment,
} from "./vocabulary.ts";

// The economic-interest path's own segment, used to key ECONOMIC_INTEREST_TREE
// and labels.
export function economicInterestSegment(
  path: EconomicInterest,
): EconomicInterestSegment {
  return pathSegment(path) as EconomicInterestSegment;
}
