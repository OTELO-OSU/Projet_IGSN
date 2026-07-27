import { type GeologicalAge } from "./geological-age.ts";

// ICS International Chronostratigraphic Chart v2023/09 series/epoch boundary
// ages, in Ma (millions of years before present), ascending. Index i is the
// boundary before rank i (index 0 = the present); a rank r (1-based
// GeologicalAge) spans [BOUNDARIES[r-1], BOUNDARIES[r]] = [young edge, old edge].
// So the array holds GEOLOGICAL_AGES.length + 1 boundaries. Exact GSSP values,
// not rounded; the Hadean base (oldest edge) uses the age-of-Earth convention
// (4567 Ma) since the chart leaves it informal.
export const GEOLOGICAL_AGE_BOUNDARIES_MA = [
  0, 0.0117, 2.58, 5.333, 23.03, 33.9, 56.0, 66.0, 100.5, 145.0, 161.5, 174.7,
  201.4, 237, 247.2, 251.902, 259.51, 273.01, 298.9, 323.2, 358.9, 382.7, 393.3,
  419.2, 423.0, 427.4, 433.4, 443.8, 458.4, 470.0, 485.4, 497, 509, 521, 538.8,
  635, 720, 1000, 1200, 1400, 1600, 1800, 2050, 2300, 2500, 2800, 3200, 3600,
  4031, 4567,
] as const;

// The [young, old] Ma interval a stratigraphic rank spans (young < old).
export function geologicalAgeBoundsMa(
  rank: GeologicalAge,
): readonly [number, number] {
  // rank is a validated 1..49 GeologicalAge, so both edges always exist.
  return [
    GEOLOGICAL_AGE_BOUNDARIES_MA[rank - 1]!,
    GEOLOGICAL_AGE_BOUNDARIES_MA[rank]!,
  ];
}
