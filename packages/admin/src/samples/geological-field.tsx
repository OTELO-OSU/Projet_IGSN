import { geologicalAgeSchema } from "@projet-igsn/domain/sample/age/geological-age";

import type { AgeFormValues } from "#/samples/age-form.ts";

import { m } from "#/paraglide/messages.js";
import { geologicalAgeLabel } from "#/samples/sample-labels.ts";
import { useAgeForm } from "#/samples/use-age-form.ts";

const geologicalAgeItems = geologicalAgeSchema.options.map((age) => ({
  value: age,
  label: geologicalAgeLabel(age),
}));

// One stratigraphic age select, backed by the geological-age vocabulary.
export function GeologicalField({
  name,
  label,
  requiredWhenName,
  mirrorName,
}: {
  name: keyof AgeFormValues;
  label: string;
  // The sibling bound (max for min, min for max): a range needs both, so this
  // bound is required once the sibling holds a value (publish blocker
  // geological_age_range_incomplete). Omitted for a fixed value, which has no sibling.
  requiredWhenName?: keyof AgeFormValues;
  // A non-range value is stored in both bounds (min == max), so the fixed select
  // mirrors its value into the other bound on change.
  mirrorName?: keyof AgeFormValues;
}) {
  const form = useAgeForm();
  return (
    <form.AppField
      name={`age.${name}`}
      listeners={
        mirrorName
          ? {
              onChange: ({ value }) =>
                form.setFieldValue(`age.${mirrorName}`, value),
            }
          : undefined
      }
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
            <field.ComboboxField
              label={label}
              requiredToPublish={required}
              items={geologicalAgeItems}
              placeholder={m.age_geological_placeholder()}
              searchPlaceholder={m.age_geological_search_placeholder()}
              emptyText={m.age_geological_empty()}
            />
          )}
        </form.Subscribe>
      )}
    </form.AppField>
  );
}
