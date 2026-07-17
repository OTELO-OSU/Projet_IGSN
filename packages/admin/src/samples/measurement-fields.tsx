import { MASS_UNITS } from "@projet-igsn/domain/sample/description/mass-unit";
import { SIZE_UNITS } from "@projet-igsn/domain/sample/description/size-unit";
import {
  VOLUME_UNITS,
  volumeUnitLabel,
} from "@projet-igsn/domain/sample/description/volume-unit";

import { m } from "#/paraglide/messages.js";
import { useDescriptionForm } from "#/samples/use-description-form.ts";

// Size and mass units are language-neutral symbols (their own label); volume
// units need the display map for superscripts (see volumeUnitLabel).
const sizeUnitItems = SIZE_UNITS.map((value) => ({ value, label: value }));
const massUnitItems = MASS_UNITS.map((value) => ({ value, label: value }));
const volumeUnitItems = VOLUME_UNITS.map((value) => ({
  value,
  label: volumeUnitLabel[value],
}));

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

// The measurement rows, one value + unit pair each. The unit is disabled and
// unmarked until its value is entered, then enabled and required (mirroring
// the location elevation unit); the domain schema, run live by the form,
// requires each half once the other is set and rejects non-positive values.
export function MeasurementFields() {
  const form = useDescriptionForm();
  return (
    <>
      {measurements.map(({ key, label, unitLabel, items }) => (
        <div key={key} className="grid gap-4 sm:grid-cols-2">
          <form.AppField name={`description.${key}Value`}>
            {(field) => <field.NumberField label={label()} />}
          </form.AppField>
          <form.Subscribe
            selector={(state) =>
              state.values.description[`${key}Value`] !== undefined
            }
          >
            {(required) => (
              <form.AppField name={`description.${key}Unit`}>
                {(field) => (
                  <field.ComboboxField
                    label={unitLabel()}
                    requiredToPublish={required}
                    items={items}
                    placeholder={m.unit_placeholder()}
                    searchPlaceholder={m.unit_search_placeholder()}
                    emptyText={m.unit_empty()}
                    disabled={!required}
                  />
                )}
              </form.AppField>
            )}
          </form.Subscribe>
        </div>
      ))}
    </>
  );
}
