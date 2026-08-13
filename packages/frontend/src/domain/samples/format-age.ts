import type { Age } from "@projet-igsn/domain/sample/age/model";

import {
  geologicalAgeLabel,
  numericUnitLabel,
  yearsUnitLabel,
} from "#/domain/samples/sample-labels.ts";

function unitSuffix(
  unit: Age["numericAgeUnit"],
  years: Age["numericAgeYearsUnit"],
): string {
  const unitLabel = unit ? ` ${numericUnitLabel(unit)}` : "";
  const yearsLabel = years ? ` ${yearsUnitLabel(years)}` : "";
  return `${unitLabel}${yearsLabel}`;
}

export function formatNumericAge(age: Age): string | null {
  const { numericAgeMin: min, numericAgeMax: max } = age;
  if (min == null && max == null) return null;
  const suffix = unitSuffix(age.numericAgeUnit, age.numericAgeYearsUnit);
  if (min != null && max != null && min !== max) {
    return `${min}-${max}${suffix}`;
  }
  return `${min ?? max}${suffix}`;
}

export function formatGeologicalAge(age: Age): string | null {
  const { geologicalAgeMin: min, geologicalAgeMax: max } = age;
  if (!min && !max) return null;
  if (min && max && min !== max) {
    return `${geologicalAgeLabel(min)}-${geologicalAgeLabel(max)}`;
  }
  const one = min ?? max;
  return one ? geologicalAgeLabel(one) : null;
}
