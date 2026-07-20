import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { HUMIDITY_TYPES } from "@projet-igsn/domain/sample/condition/humidity-type";
import { LIGHTS } from "@projet-igsn/domain/sample/condition/light";
import { PACKAGINGS } from "@projet-igsn/domain/sample/condition/packaging";
import { PRESSURE_TYPES } from "@projet-igsn/domain/sample/condition/pressure-type";
import {
  PRESSURE_UNITS,
  pressureUnitLabel,
} from "@projet-igsn/domain/sample/condition/pressure-unit";
import { STORAGE_CONDITIONS } from "@projet-igsn/domain/sample/condition/storage-condition";
import { TEMPERATURE_TYPES } from "@projet-igsn/domain/sample/condition/temperature-type";
import {
  TEMPERATURE_UNITS,
  temperatureUnitLabel,
} from "@projet-igsn/domain/sample/condition/temperature-unit";

import { m } from "#/paraglide/messages.js";
import { type ConditionDraft } from "#/samples/compose-condition.ts";
import {
  humidityTypeLabel,
  lightLabel,
  packagingLabel,
  pressureTypeLabel,
  storageConditionLabel,
  temperatureTypeLabel,
} from "#/samples/sample-labels.ts";

const packagingItems = PACKAGINGS.map((value) => ({
  value,
  label: packagingLabel(value),
}));
const lightItems = LIGHTS.map((value) => ({ value, label: lightLabel(value) }));
const humidityTypeItems = HUMIDITY_TYPES.map((value) => ({
  value,
  label: humidityTypeLabel(value),
}));

// Temperature and pressure share the reading-row shape: a category, then a
// value whose unit becomes required once it is entered (see MeasurementFields).
const readings = [
  {
    key: "temperature" as const,
    label: m.field_temperature,
    valueLabel: m.field_temperature_value,
    unitLabel: m.field_temperature_unit,
    placeholder: m.temperature_placeholder,
    searchPlaceholder: m.temperature_search_placeholder,
    emptyText: m.temperature_empty,
    typeItems: TEMPERATURE_TYPES.map((value) => ({
      value,
      label: temperatureTypeLabel(value),
    })),
    unitItems: TEMPERATURE_UNITS.map((value) => ({
      value,
      label: temperatureUnitLabel[value],
    })),
  },
  {
    key: "pressure" as const,
    label: m.field_pressure,
    valueLabel: m.field_pressure_value,
    unitLabel: m.field_pressure_unit,
    placeholder: m.pressure_placeholder,
    searchPlaceholder: m.pressure_search_placeholder,
    emptyText: m.pressure_empty,
    typeItems: PRESSURE_TYPES.map((value) => ({
      value,
      label: pressureTypeLabel(value),
    })),
    unitItems: PRESSURE_UNITS.map((value) => ({
      value,
      label: pressureUnitLabel[value],
    })),
  },
];

// "No specific condition" contradicts every controlled condition, so whichever
// side is checked disables the other (dependent-fields rule: the invalid mix
// cannot be expressed, matching the schema's exclusivity refinement).
const storageConditionItems = (selected: readonly string[]) => {
  const none = selected.includes("no_specific_condition");
  const controlled = selected.some(
    (value) => value !== "no_specific_condition",
  );
  return STORAGE_CONDITIONS.map((value) => ({
    value,
    label: storageConditionLabel(value),
    disabled: value === "no_specific_condition" ? controlled : none,
  }));
};

// The Condition tab. Every part is optional and independent; a numeric
// reading is disabled until its category is chosen, and its unit until the
// value is entered (then required). Render inside a `form.AppForm`. The form
// store holds the flat `condition.*` draft; `composeCondition` maps it back
// on submit.
export function SampleConditionFields() {
  // The sample form, typed down to what this tab reads: the flat
  // `condition.*` draft (same seam as use-description-form.ts, inlined while
  // this is its only consumer).
  const form = useTypedAppFormContext({
    defaultValues: {} as { condition: ConditionDraft },
  });
  return (
    <div className="grid gap-4">
      <form.AppField name="condition.packaging">
        {(field) => (
          <field.ComboboxField
            label={m.field_packaging()}
            items={packagingItems}
            placeholder={m.packaging_placeholder()}
            searchPlaceholder={m.packaging_search_placeholder()}
            emptyText={m.packaging_empty()}
          />
        )}
      </form.AppField>

      <form.AppField name="condition.storageConditions">
        {(field) => (
          <field.CheckboxGroupField
            label={m.field_storage_conditions()}
            items={storageConditionItems(field.state.value)}
          />
        )}
      </form.AppField>

      {readings.map((reading) => (
        <div key={reading.key} className="grid gap-4 sm:grid-cols-3">
          <form.AppField name={`condition.${reading.key}Type`}>
            {(field) => (
              <field.ComboboxField
                label={reading.label()}
                items={reading.typeItems}
                placeholder={reading.placeholder()}
                searchPlaceholder={reading.searchPlaceholder()}
                emptyText={reading.emptyText()}
              />
            )}
          </form.AppField>
          <form.Subscribe
            selector={(state) => ({
              hasType: !!state.values.condition[`${reading.key}Type`],
              hasValue:
                state.values.condition[`${reading.key}Value`] !== undefined,
            })}
          >
            {({ hasType, hasValue }) => (
              <>
                <form.AppField name={`condition.${reading.key}Value`}>
                  {(field) => (
                    <field.NumberField
                      label={reading.valueLabel()}
                      disabled={!hasType}
                    />
                  )}
                </form.AppField>
                <form.AppField name={`condition.${reading.key}Unit`}>
                  {(field) => (
                    <field.ComboboxField
                      label={reading.unitLabel()}
                      requiredToPublish={hasValue}
                      items={reading.unitItems}
                      placeholder={m.unit_placeholder()}
                      searchPlaceholder={m.unit_search_placeholder()}
                      emptyText={m.unit_empty()}
                      disabled={!hasValue}
                    />
                  )}
                </form.AppField>
              </>
            )}
          </form.Subscribe>
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField name="condition.humidityType">
          {(field) => (
            <field.ComboboxField
              label={m.field_humidity()}
              items={humidityTypeItems}
              placeholder={m.humidity_placeholder()}
              searchPlaceholder={m.humidity_search_placeholder()}
              emptyText={m.humidity_empty()}
            />
          )}
        </form.AppField>
        <form.Subscribe
          selector={(state) => !!state.values.condition.humidityType}
        >
          {(hasType) => (
            <form.AppField name="condition.humidityPercentage">
              {(field) => (
                <field.NumberField
                  label={m.field_humidity_percentage()}
                  disabled={!hasType}
                />
              )}
            </form.AppField>
          )}
        </form.Subscribe>
      </div>

      <form.AppField name="condition.light">
        {(field) => (
          <field.ComboboxField
            label={m.field_light()}
            items={lightItems}
            placeholder={m.light_placeholder()}
            searchPlaceholder={m.light_search_placeholder()}
            emptyText={m.light_empty()}
          />
        )}
      </form.AppField>

      <form.AppField name="condition.specificConditions">
        {(field) => (
          <field.TextField label={m.field_specific_conditions()} multiline />
        )}
      </form.AppField>
    </div>
  );
}
