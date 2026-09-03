import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { isReadingControlled } from "@projet-igsn/domain/sample/condition/controlled-reading";
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
import { hasReadingType } from "#/samples/compose-condition.ts";
import { hasMeasurementValue } from "#/samples/compose-measurement.ts";
import {
  humidityTypeLabel,
  lightLabel,
  packagingLabel,
  pressureTypeLabel,
  storageConditionLabel,
  temperatureTypeLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const packagingItems = toComboboxItems(PACKAGINGS, packagingLabel);
const lightItems = toComboboxItems(LIGHTS, lightLabel);
const humidityTypeItems = toComboboxItems(HUMIDITY_TYPES, humidityTypeLabel);

const readings = [
  {
    key: "temperature" as const,
    label: m.field_temperature,
    valueLabel: m.field_temperature_value,
    unitLabel: m.field_temperature_unit,
    placeholder: m.temperature_placeholder,
    searchPlaceholder: m.temperature_search_placeholder,
    emptyText: m.temperature_empty,
    typeItems: toComboboxItems(TEMPERATURE_TYPES, temperatureTypeLabel),
    unitItems: toComboboxItems(
      TEMPERATURE_UNITS,
      (value) => temperatureUnitLabel[value],
    ),
  },
  {
    key: "pressure" as const,
    label: m.field_pressure,
    valueLabel: m.field_pressure_value,
    unitLabel: m.field_pressure_unit,
    placeholder: m.pressure_placeholder,
    searchPlaceholder: m.pressure_search_placeholder,
    emptyText: m.pressure_empty,
    typeItems: toComboboxItems(PRESSURE_TYPES, pressureTypeLabel),
    unitItems: toComboboxItems(
      PRESSURE_UNITS,
      (value) => pressureUnitLabel[value],
    ),
  },
];

const storageConditionItems = (selected: readonly string[]) => {
  const none = selected.includes("no_specific_condition");
  const controlled = selected.some(
    (value) => value !== "no_specific_condition",
  );
  return STORAGE_CONDITIONS.filter((value) =>
    value === "no_specific_condition" ? !controlled : !none,
  ).map((value) => ({ value, label: storageConditionLabel(value) }));
};

export function SampleConditionFields() {
  const form = useSampleForm();
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
        <form.Subscribe
          key={reading.key}
          selector={(state) =>
            isReadingControlled(
              state.values.condition.storageConditions,
              reading.key,
            )
          }
        >
          {(controlled) =>
            controlled ? (
              <div className="grid gap-4 sm:grid-cols-3">
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
                  selector={(state) =>
                    hasReadingType(state.values.condition[`${reading.key}Type`])
                  }
                >
                  {(hasType) =>
                    hasType ? (
                      <>
                        <form.AppField name={`condition.${reading.key}Value`}>
                          {(field) => (
                            <field.NumberField label={reading.valueLabel()} />
                          )}
                        </form.AppField>
                        <form.Subscribe
                          selector={(state) =>
                            hasMeasurementValue(
                              state.values.condition[`${reading.key}Value`],
                            )
                          }
                        >
                          {(hasValue) =>
                            hasValue ? (
                              <form.AppField
                                name={`condition.${reading.key}Unit`}
                              >
                                {(field) => (
                                  <field.ComboboxField
                                    label={reading.unitLabel()}
                                    requiredToPublish
                                    items={reading.unitItems}
                                    placeholder={m.unit_placeholder()}
                                    searchPlaceholder={m.unit_search_placeholder()}
                                    emptyText={m.unit_empty()}
                                  />
                                )}
                              </form.AppField>
                            ) : null
                          }
                        </form.Subscribe>
                      </>
                    ) : null
                  }
                </form.Subscribe>
              </div>
            ) : null
          }
        </form.Subscribe>
      ))}

      <form.Subscribe
        selector={(state) =>
          isReadingControlled(
            state.values.condition.storageConditions,
            "humidity",
          )
        }
      >
        {(controlled) =>
          controlled ? (
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
                selector={(state) =>
                  hasReadingType(state.values.condition.humidityType)
                }
              >
                {(hasType) =>
                  hasType ? (
                    <form.AppField name="condition.humidityPercentage">
                      {(field) => (
                        <field.NumberField
                          label={m.field_humidity_percentage()}
                        />
                      )}
                    </form.AppField>
                  ) : null
                }
              </form.Subscribe>
            </div>
          ) : null
        }
      </form.Subscribe>

      <form.Subscribe
        selector={(state) =>
          isReadingControlled(state.values.condition.storageConditions, "light")
        }
      >
        {(controlled) =>
          controlled ? (
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
          ) : null
        }
      </form.Subscribe>

      <form.AppField name="condition.specificConditions">
        {(field) => (
          <field.TextField label={m.field_specific_conditions()} multiline />
        )}
      </form.AppField>
    </div>
  );
}
