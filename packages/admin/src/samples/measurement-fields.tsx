import {
  type ComboboxItem,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { MASS_UNITS } from "@projet-igsn/domain/sample/description/mass-unit";
import { SIZE_UNITS } from "@projet-igsn/domain/sample/description/size-unit";
import {
  VOLUME_UNITS,
  volumeUnitLabel,
} from "@projet-igsn/domain/sample/description/volume-unit";

import { m } from "#/paraglide/messages.js";
import { hasMeasurementValue } from "#/samples/compose-measurement.ts";
import { type SampleDraft } from "#/samples/sample-draft-schema.ts";
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

type MeasurementName =
  | `description.${"length" | "width" | "thickness" | "mass" | "volume"}`
  | `syntheticDetails.${"experimentDuration" | "temperature" | "pressure"}`;

export function MeasurementFieldPair({
  name,
  selectValue,
  label,
  unitLabel,
  items,
}: {
  name: MeasurementName;
  selectValue: (values: SampleDraft) => number | undefined;
  label: () => string;
  unitLabel: () => string;
  items: ComboboxItem[];
}) {
  const form = useSampleForm();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name={`${name}Value`}>
        {(field) => <field.NumberField label={label()} />}
      </form.AppField>
      <form.Subscribe
        selector={(state) => hasMeasurementValue(selectValue(state.values))}
      >
        {(hasValue) =>
          hasValue ? (
            <form.AppField name={`${name}Unit`}>
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
  );
}

export function MeasurementFields() {
  return (
    <>
      {measurements.map(({ key, label, unitLabel, items }) => (
        <MeasurementFieldPair
          key={key}
          name={`description.${key}`}
          selectValue={(values) => values.description[`${key}Value`]}
          label={label}
          unitLabel={unitLabel}
          items={items}
        />
      ))}
    </>
  );
}
