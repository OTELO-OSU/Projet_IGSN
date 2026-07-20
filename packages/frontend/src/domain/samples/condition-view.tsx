import type { Condition } from "@projet-igsn/domain/sample/condition/model";

import { pressureUnitLabel } from "@projet-igsn/domain/sample/condition/pressure-unit";
import { temperatureUnitLabel } from "@projet-igsn/domain/sample/condition/temperature-unit";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  humidityTypeLabel,
  lightLabel,
  packagingLabel,
  pressureTypeLabel,
  storageConditionLabel,
  temperatureTypeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

// A category with its optional numeric reading: "Frozen (-18 °C)", or just
// the category label when no reading was recorded.
const withReading = (label: string, reading: string | null): string =>
  reading == null ? label : `${label} (${reading})`;

// The condition rows of the sample detail page; FieldRow drops the parts the
// sample lacks (every part of a Condition is optional; the parent hides the
// whole section when the sample has none).
export function ConditionView({ condition }: { condition: Condition }) {
  const {
    packaging,
    storageConditions,
    temperature,
    humidity,
    light,
    pressure,
    specificConditions,
  } = condition;
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_packaging()}
        value={packaging && packagingLabel(packaging)}
      />
      <FieldRow
        label={m.sample_field_storage_conditions()}
        value={storageConditions?.map(storageConditionLabel).join(", ")}
      />
      <FieldRow
        label={m.sample_field_temperature()}
        value={
          temperature &&
          withReading(
            temperatureTypeLabel(temperature.type),
            temperature.measurement
              ? `${temperature.measurement.value} ${temperatureUnitLabel[temperature.measurement.unit]}`
              : null,
          )
        }
      />
      <FieldRow
        label={m.sample_field_humidity()}
        value={
          humidity &&
          withReading(
            humidityTypeLabel(humidity.type),
            humidity.percentage == null ? null : `${humidity.percentage}%`,
          )
        }
      />
      <FieldRow
        label={m.sample_field_light()}
        value={light && lightLabel(light)}
      />
      <FieldRow
        label={m.sample_field_pressure()}
        value={
          pressure &&
          withReading(
            pressureTypeLabel(pressure.type),
            pressure.measurement
              ? `${pressure.measurement.value} ${pressureUnitLabel[pressure.measurement.unit]}`
              : null,
          )
        }
      />
      <FieldRow
        label={m.sample_field_specific_conditions()}
        value={specificConditions}
      />
    </FieldRows>
  );
}
