import type { Age } from "@projet-igsn/domain/sample/age/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  geologicalAgeLabel,
  numericUnitLabel,
  yearsUnitLabel,
} from "#/domain/samples/sample-labels.ts";
import { Field } from "#/domain/samples/sample-view-fields.tsx";
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

// "12000 a BP" for a single value (min == max); "500–2000 ka" for a range, with
// the shared unit shown once. null when no value is set.
function formatNumericAge(age: Age): string | null {
  const { numericAgeMin: min, numericAgeMax: max } = age;
  if (min == null && max == null) return null;
  const suffix = unitSuffix(age.numericAgeUnit, age.numericAgeYearsUnit);
  if (min != null && max != null && min !== max) {
    return `${min}–${max}${suffix}`;
  }
  return `${min ?? max}${suffix}`;
}

// A geological-age label, or "min–max" for a range; null when neither. Same
// separator as the numeric range above.
function formatGeologicalAge(age: Age): string | null {
  const { geologicalAgeMin: min, geologicalAgeMax: max } = age;
  if (!min && !max) return null;
  if (min && max && min !== max) {
    return `${geologicalAgeLabel(min)}–${geologicalAgeLabel(max)}`;
  }
  const one = min ?? max;
  return one ? geologicalAgeLabel(one) : null;
}

export function hasAge(age: Sample["age"]): boolean {
  if (!age) return false;
  return Boolean(
    formatNumericAge(age) || formatGeologicalAge(age) || age.geologicalUnit,
  );
}

export function AgeSection({ age }: { age: Sample["age"] }) {
  if (!age) return null;

  const numericAge = formatNumericAge(age);
  const geologicalAge = formatGeologicalAge(age);
  const geologicalUnit = age.geologicalUnit ?? null;
  if (!numericAge && !geologicalAge && !geologicalUnit) return null;

  return (
    <section id="age" aria-labelledby="age-heading">
      <h2
        id="age-heading"
        className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
      >
        {m.sample_section_age()}
      </h2>
      <dl className="mt-2 divide-y">
        {numericAge ? (
          <Field label={m.sample_field_numeric_age()}>{numericAge}</Field>
        ) : null}
        {geologicalAge ? (
          <Field label={m.sample_field_geological_age()}>{geologicalAge}</Field>
        ) : null}
        {geologicalUnit ? (
          <Field label={m.sample_field_geological_unit()}>
            {geologicalUnit}
          </Field>
        ) : null}
      </dl>
    </section>
  );
}
