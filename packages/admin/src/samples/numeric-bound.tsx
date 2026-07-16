import { numericUnitSchema } from "@projet-igsn/domain/sample/age/numeric-unit";
import { yearsUnitSchema } from "@projet-igsn/domain/sample/age/years-unit";

import type { AgeFormValues } from "#/samples/age-form.ts";

import { m } from "#/paraglide/messages.js";
import { numericUnitLabel, yearsUnitLabel } from "#/samples/sample-labels.ts";
import { useAgeForm } from "#/samples/use-age-form.ts";
import { withRequired } from "#/samples/with-required.ts";

const numericUnitItems = numericUnitSchema.options.map((unit) => ({
  value: unit,
  label: numericUnitLabel(unit),
}));
const yearsUnitItems = yearsUnitSchema.options.map((unit) => ({
  value: unit,
  label: yearsUnitLabel(unit),
}));

type NumericBoundProps = {
  valueName: keyof AgeFormValues;
  unitName: keyof AgeFormValues;
  yearsName: keyof AgeFormValues;
  valueLabel: string;
  // The sibling bound (max for min, min for max): a range needs both, so this
  // bound's value is required once the sibling holds one (publish blocker
  // numeric_age_range_incomplete). Omitted for a fixed value, which has no sibling.
  requiredWhenName?: keyof AgeFormValues;
};

// One numeric age input: a value, its unit, and (only meaningful counted from
// annum) a reference. The unit is disabled until a value is entered, the
// reference until the unit is "a"; both hide their "*" while disabled.
export function NumericBound({
  valueName,
  unitName,
  yearsName,
  valueLabel,
  requiredWhenName,
}: NumericBoundProps) {
  const form = useAgeForm();
  return (
    <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
      <form.AppField
        name={`age.${valueName}`}
        listeners={{
          // The unit (and so the reference) is disabled without a value; clear
          // both when the value is emptied so a stale unit never fails
          // validation on a field the user can no longer reach.
          onChange: ({ value }) => {
            if (!value.trim()) {
              form.setFieldValue(`age.${unitName}`, "");
              form.setFieldValue(`age.${yearsName}`, "");
            }
          },
        }}
      >
        {(field) => (
          <form.Subscribe
            selector={(state) =>
              requiredWhenName
                ? Boolean(state.values.age[requiredWhenName].trim())
                : false
            }
          >
            {(required) => (
              <field.TextField label={withRequired(valueLabel, required)} />
            )}
          </form.Subscribe>
        )}
      </form.AppField>
      <form.AppField
        name={`age.${unitName}`}
        listeners={{
          // The reference is disabled for any unit but "a"; clear it on the way
          // out so a stale years unit never fails validation on a disabled field.
          onChange: ({ value }) => {
            if (value !== numericUnitSchema.enum.a)
              form.setFieldValue(`age.${yearsName}`, "");
          },
        }}
      >
        {(field) => (
          // A numeric value must state its unit before publish, so the unit is
          // required once a value is entered (publish blocker numeric_age_unit_missing).
          <form.Subscribe
            selector={(state) => Boolean(state.values.age[valueName].trim())}
          >
            {(required) => (
              <field.ComboboxField
                label={withRequired(m.field_numeric_unit(), required)}
                items={numericUnitItems}
                placeholder={m.age_unit_placeholder()}
                searchPlaceholder={m.age_unit_search_placeholder()}
                emptyText={m.age_unit_empty()}
                disabled={!required}
              />
            )}
          </form.Subscribe>
        )}
      </form.AppField>
      <form.AppField name={`age.${yearsName}`}>
        {(field) => (
          // A reference is required (and only meaningful) once the unit is annum
          // (publish blocker numeric_age_reference_missing); disabled otherwise.
          <form.Subscribe
            selector={(state) =>
              state.values.age[unitName] === numericUnitSchema.enum.a
            }
          >
            {(required) => (
              <field.ComboboxField
                label={withRequired(m.field_numeric_years_unit(), required)}
                items={yearsUnitItems}
                placeholder={m.age_years_placeholder()}
                searchPlaceholder={m.age_years_search_placeholder()}
                emptyText={m.age_years_empty()}
                disabled={!required}
              />
            )}
          </form.Subscribe>
        )}
      </form.AppField>
    </div>
  );
}
