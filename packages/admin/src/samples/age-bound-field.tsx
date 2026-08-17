import { GEOLOGICAL_AGES } from "@projet-igsn/domain/sample/age/geological-age";

import type { AgeFormValues } from "#/samples/age-form.ts";

import { m } from "#/paraglide/messages.js";
import { geologicalAgeLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const geologicalAgeItems = GEOLOGICAL_AGES.map((age) => ({
  value: age.toString(),
  label: geologicalAgeLabel(age),
}));

export function AgeBoundField({
  control,
  name,
  label,
  requiredWhenName,
  mirrorName,
}: {
  control: "numeric" | "geological";
  name: keyof AgeFormValues;
  label: string;
  requiredWhenName?: keyof AgeFormValues;
  mirrorName?: keyof AgeFormValues;
}) {
  const form = useSampleForm();
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
          {(required) =>
            control === "numeric" ? (
              <field.NumberField label={label} requiredToPublish={required} />
            ) : (
              <field.ComboboxField
                label={label}
                requiredToPublish={required}
                items={geologicalAgeItems}
                placeholder={m.age_geological_placeholder()}
                searchPlaceholder={m.age_geological_search_placeholder()}
                emptyText={m.age_geological_empty()}
              />
            )
          }
        </form.Subscribe>
      )}
    </form.AppField>
  );
}
