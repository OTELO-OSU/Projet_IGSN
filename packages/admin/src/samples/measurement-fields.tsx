import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { MASS_UNITS } from "@projet-igsn/domain/sample/description/mass-unit";
import { SIZE_UNITS } from "@projet-igsn/domain/sample/description/size-unit";
import {
  VOLUME_UNITS,
  volumeUnitLabel,
} from "@projet-igsn/domain/sample/description/volume-unit";

import { m } from "#/paraglide/messages.js";
import { hasMeasurementValue } from "#/samples/compose-measurement.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const sizeUnitItems = toComboboxItems(SIZE_UNITS, (value) => value);
const massUnitItems = toComboboxItems(MASS_UNITS, (value) => value);
const volumeUnitItems = toComboboxItems(
  VOLUME_UNITS,
  (value) => volumeUnitLabel[value],
);

const measurements = [
  {
    key: "length" as const,
    label: m.field_length,
    unitLabel: m.field_length_unit,
    items: sizeUnitItems,
  },
  {
    key: "width" as const,
    label: m.field_width,
    unitLabel: m.field_width_unit,
    items: sizeUnitItems,
  },
  {
    key: "thickness" as const,
    label: m.field_thickness,
    unitLabel: m.field_thickness_unit,
    items: sizeUnitItems,
  },
  {
    key: "mass" as const,
    label: m.field_mass,
    unitLabel: m.field_mass_unit,
    items: massUnitItems,
  },
  {
    key: "volume" as const,
    label: m.field_volume,
    unitLabel: m.field_volume_unit,
    items: volumeUnitItems,
  },
];

export function MeasurementFields() {
  const form = useSampleForm();
  return (
    <>
      {measurements.map(({ key, label, unitLabel, items }) => (
        <div key={key} className="grid gap-4 sm:grid-cols-2">
          <form.AppField name={`description.${key}Value`}>
            {(field) => <field.NumberField label={label()} />}
          </form.AppField>
          <form.Subscribe
            selector={(state) =>
              hasMeasurementValue(state.values.description[`${key}Value`])
            }
          >
            {(hasValue) =>
              hasValue ? (
                <form.AppField name={`description.${key}Unit`}>
                  {(field) => (
                    <field.ComboboxField
                      label={unitLabel()}
                      requiredToPublish
                      items={items}
                      placeholder={m.unit_placeholder()}
                      searchPlaceholder={m.unit_search_placeholder()}
                      emptyText={m.unit_empty()}
                    />
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>
        </div>
      ))}
    </>
  );
}
