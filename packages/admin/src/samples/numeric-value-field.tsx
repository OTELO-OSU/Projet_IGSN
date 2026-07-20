import type { AgeFormValues } from "#/samples/age-form.ts";

import { useAgeForm } from "#/samples/use-age-form.ts";

type NumericValueFieldProps = {
  name: keyof AgeFormValues;
  label: string;
  // The sibling bound (max for min, min for max): a range needs both, so this
  // bound is required once the sibling holds a value (publish blocker
  // numeric_age_range_incomplete). Omitted for a fixed value, which has no sibling.
  requiredWhenName?: keyof AgeFormValues;
  // A non-range value is stored in both bounds (min == max), so the fixed input
  // mirrors its value into the other bound as the user types.
  mirrorName?: keyof AgeFormValues;
};

// One numeric age value input. The shared unit/reference live in the section;
// this only edits a number. When the numeric block is emptied it clears the
// shared unit/reference so a stale unit never fails validation on a control the
// user can no longer reach.
export function NumericValueField({
  name,
  label,
  requiredWhenName,
  mirrorName,
}: NumericValueFieldProps) {
  const form = useAgeForm();
  return (
    <form.AppField
      name={`age.${name}`}
      listeners={{
        onChange: ({ value }) => {
          if (mirrorName) form.setFieldValue(`age.${mirrorName}`, value);
          const { numericAgeMin, numericAgeMax } = form.state.values.age;
          if (!numericAgeMin?.trim() && !numericAgeMax?.trim()) {
            form.setFieldValue("age.numericAgeUnit", "");
            form.setFieldValue("age.numericAgeYearsUnit", "");
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
            <field.TextField label={label} requiredToPublish={required} />
          )}
        </form.Subscribe>
      )}
    </form.AppField>
  );
}
