import type { Age } from "@projet-igsn/domain/sample/age/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  geologicalAgeLabel,
  numericUnitLabel,
  yearsUnitLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

// The shared unit and reference, shown once (e.g. " a BP"); empty when unset.
function unitSuffix(
  unit: Age["numericAgeUnit"],
  years: Age["numericAgeYearsUnit"],
): string {
  const unitLabel = unit ? ` ${numericUnitLabel(unit)}` : "";
  const yearsLabel = years ? ` ${yearsUnitLabel(years)}` : "";
  return `${unitLabel}${yearsLabel}`;
}

// "12000 a BP" for a single value (min == max); "500-2000 ka" for a range, with
// the shared unit shown once. null when no value is set.
function formatNumericAge(age: Age): string | null {
  const { numericAgeMin: min, numericAgeMax: max } = age;
  if (min == null && max == null) return null;
  const suffix = unitSuffix(age.numericAgeUnit, age.numericAgeYearsUnit);
  if (min != null && max != null && min !== max) {
    return `${min}-${max}${suffix}`;
  }
  return `${min ?? max}${suffix}`;
}

// A geological-age label, or "min-max" for a range; null when neither. Same
// separator as the numeric range above.
function formatGeologicalAge(age: Age): string | null {
  const { geologicalAgeMin: min, geologicalAgeMax: max } = age;
  if (!min && !max) return null;
  if (min && max && min !== max) {
    return `${geologicalAgeLabel(min)}-${geologicalAgeLabel(max)}`;
  }
  const one = min ?? max;
  return one ? geologicalAgeLabel(one) : null;
}

export function hasAge(age: Sample["age"]): age is Age {
  if (!age) return false;
  return Boolean(
    formatNumericAge(age) || formatGeologicalAge(age) || age.geologicalUnit,
  );
}

// The age rows of the sample detail page; FieldRow drops the parts the sample
// lacks (every part of an Age is optional; the parent hides the whole section
// when the sample has none, via hasAge).
export function AgeView({ age }: { age: Age }) {
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_numeric_age()}
        value={formatNumericAge(age)}
      />
      <FieldRow
        label={m.sample_field_geological_age()}
        value={formatGeologicalAge(age)}
      />
      <FieldRow
        label={m.sample_field_geological_unit()}
        value={age.geologicalUnit}
      />
    </FieldRows>
  );
}
