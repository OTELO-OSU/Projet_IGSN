import type { Condition } from "@projet-igsn/domain/sample/condition/model";

import { pressureUnitLabel } from "@projet-igsn/domain/sample/condition/pressure-unit";
import { temperatureUnitLabel } from "@projet-igsn/domain/sample/condition/temperature-unit";

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

// The condition rows of the sample detail page, one per part actually present
// (every part of a Condition is optional; the parent hides the whole section
// when the sample has none).
export function ConditionView({ condition }: { condition: Condition }) {
  const rows: { label: string; value: string }[] = [];
  if (condition.packaging) {
    rows.push({
      label: m.sample_field_packaging(),
      value: packagingLabel(condition.packaging),
    });
  }
  if (condition.storageConditions) {
    rows.push({
      label: m.sample_field_storage_conditions(),
      value: condition.storageConditions.map(storageConditionLabel).join(", "),
    });
  }
  if (condition.temperature) {
    const { type, measurement } = condition.temperature;
    rows.push({
      label: m.sample_field_temperature(),
      value: withReading(
        temperatureTypeLabel(type),
        measurement
          ? `${measurement.value} ${temperatureUnitLabel[measurement.unit]}`
          : null,
      ),
    });
  }
  if (condition.humidity) {
    const { type, percentage } = condition.humidity;
    rows.push({
      label: m.sample_field_humidity(),
      value: withReading(
        humidityTypeLabel(type),
        percentage == null ? null : `${percentage}%`,
      ),
    });
  }
  if (condition.light) {
    rows.push({
      label: m.sample_field_light(),
      value: lightLabel(condition.light),
    });
  }
  if (condition.pressure) {
    const { type, measurement } = condition.pressure;
    rows.push({
      label: m.sample_field_pressure(),
      value: withReading(
        pressureTypeLabel(type),
        measurement
          ? `${measurement.value} ${pressureUnitLabel[measurement.unit]}`
          : null,
      ),
    });
  }
  if (condition.specificConditions) {
    rows.push({
      label: m.sample_field_specific_conditions(),
      value: condition.specificConditions,
    });
  }
  return (
    <dl className="mt-2 divide-y">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex gap-4 px-4 py-3">
          <dt className="text-muted-foreground w-40">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
