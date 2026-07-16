import type { Age } from "@projet-igsn/domain/sample/age/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  geologicalAgeLabel,
  numericUnitLabel,
  yearsUnitLabel,
} from "#/domain/samples/sample-labels.ts";
import { Field } from "#/domain/samples/sample-view-fields.tsx";
import { m } from "#/paraglide/messages.js";

// "12000 a BP" for a single value; each bound carries its own unit, so a range
// reads "500 ka–2 Ga". null when neither is set.
function formatAgeValue(
  value: number,
  unit: Age["numericAgeUnit"],
  years: Age["numericAgeYearsUnit"],
): string {
  const unitLabel = unit ? ` ${numericUnitLabel(unit)}` : "";
  const yearsLabel = years ? ` ${yearsUnitLabel(years)}` : "";
  return `${value}${unitLabel}${yearsLabel}`;
}

function formatNumericAge(age: Age): string | null {
  if (age.numericAge != null) {
    return formatAgeValue(
      age.numericAge,
      age.numericAgeUnit,
      age.numericAgeYearsUnit,
    );
  }
  if (age.numericAgeMin != null && age.numericAgeMax != null) {
    const min = formatAgeValue(
      age.numericAgeMin,
      age.numericAgeMinUnit,
      age.numericAgeMinYearsUnit,
    );
    const max = formatAgeValue(
      age.numericAgeMax,
      age.numericAgeMaxUnit,
      age.numericAgeMaxYearsUnit,
    );
    return `${min}–${max}`;
  }
  return null;
}

// A geological-age label, or "min–max" for a range; null when neither. Same
// separator as the numeric range above.
function formatGeologicalAge(age: Age): string | null {
  if (age.geologicalAge) return geologicalAgeLabel(age.geologicalAge);
  if (age.geologicalAgeMin && age.geologicalAgeMax) {
    return `${geologicalAgeLabel(age.geologicalAgeMin)}–${geologicalAgeLabel(age.geologicalAgeMax)}`;
  }
  return null;
}

export function hasAge(age: Sample["age"]): boolean {
  if (!age) return false;
  return Boolean(
    formatNumericAge(age) || formatGeologicalAge(age) || age.geologicalUnit,
  );
}

export function AgeSection({ age }: { age: Sample["age"] }) {
  if (!age || !hasAge(age)) return null;

  const numericAge = formatNumericAge(age);
  const geologicalAge = formatGeologicalAge(age);
  const geologicalUnit = age.geologicalUnit ?? null;

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
