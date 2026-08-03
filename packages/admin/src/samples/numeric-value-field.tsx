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
// this only edits a number. A unit left behind by an emptied value is kept in
// the store (ADR 0015 rule 1) and dropped by toAgeInput on submit.
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
        },
      }}
    >
      {(field) => (
        <form.Subscribe
          selector={(state) =>
            requiredWhenName
              ? state.values.age[requiredWhenName] != null
              : false
          }
        >
          {(required) => (
            <field.NumberField label={label} requiredToPublish={required} />
          )}
        </form.Subscribe>
      )}
    </form.AppField>
  );
}
