import type { HumidityType } from "@projet-igsn/domain/sample/condition/humidity-type";
import type { Light } from "@projet-igsn/domain/sample/condition/light";
import type { Condition } from "@projet-igsn/domain/sample/condition/model";
import type { Packaging } from "@projet-igsn/domain/sample/condition/packaging";
import type { PressureType } from "@projet-igsn/domain/sample/condition/pressure-type";
import type { PressureUnit } from "@projet-igsn/domain/sample/condition/pressure-unit";
import type { StorageCondition } from "@projet-igsn/domain/sample/condition/storage-condition";
import type { TemperatureType } from "@projet-igsn/domain/sample/condition/temperature-type";
import type { TemperatureUnit } from "@projet-igsn/domain/sample/condition/temperature-unit";

import {
  type ControlledReading,
  hasStorageCondition,
  isReadingControlled,
} from "@projet-igsn/domain/sample/condition/controlled-reading";

import {
  composeMeasurement,
  type MeasurementCandidate,
} from "#/samples/compose-measurement.ts";

export type ConditionDraft = {
  packaging: Packaging | null | undefined;
  storageConditions: StorageCondition[];
  temperatureType: TemperatureType | null | undefined;
  temperatureValue: number | undefined;
  temperatureUnit: TemperatureUnit | null | undefined;
  humidityType: HumidityType | null | undefined;
  humidityPercentage: number | undefined;
  light: Light | null | undefined;
  pressureType: PressureType | null | undefined;
  pressureValue: number | undefined;
  pressureUnit: PressureUnit | null | undefined;
  specificConditions: string | null | undefined;
};

type ConditionCandidate = {
  packaging: Packaging | undefined;
  storageConditions: StorageCondition[] | undefined;
  temperature:
    | {
        type: TemperatureType;
        measurement: MeasurementCandidate<TemperatureUnit> | undefined;
      }
    | undefined;
  humidity: { type: HumidityType; percentage: number | undefined } | undefined;
  light: Light | undefined;
  pressure:
    | {
        type: PressureType;
        measurement: MeasurementCandidate<PressureUnit> | undefined;
      }
    | undefined;
  specificConditions: string | undefined;
};

export const hasReadingType = <T extends string>(
  type: T | null | undefined,
): type is T => type != null;

export function composeCondition(
  draft: ConditionDraft,
): ConditionCandidate | null {
  const controlled = hasStorageCondition(draft.storageConditions);
  const controlledReading = <T>(
    reading: ControlledReading,
    value: T,
  ): T | undefined =>
    isReadingControlled(draft.storageConditions, reading) ? value : undefined;
  const condition: ConditionCandidate = {
    packaging: draft.packaging ?? undefined,
    storageConditions: controlled ? draft.storageConditions : undefined,
    temperature: controlledReading(
      "temperature",
      hasReadingType(draft.temperatureType)
        ? {
            type: draft.temperatureType,
            measurement: composeMeasurement(
              draft.temperatureValue,
              draft.temperatureUnit,
            ),
          }
        : undefined,
    ),
    humidity: controlledReading(
      "humidity",
      hasReadingType(draft.humidityType)
        ? { type: draft.humidityType, percentage: draft.humidityPercentage }
        : undefined,
    ),
    light: controlledReading("light", draft.light ?? undefined),
    pressure: controlledReading(
      "pressure",
      hasReadingType(draft.pressureType)
        ? {
            type: draft.pressureType,
            measurement: composeMeasurement(
              draft.pressureValue,
              draft.pressureUnit,
            ),
          }
        : undefined,
    ),
    specificConditions: controlled
      ? draft.specificConditions?.trim() || undefined
      : undefined,
  };
  return Object.values(condition).some((part) => part !== undefined)
    ? condition
    : null;
}

export function toConditionDraft(
  condition: Condition | null | undefined,
): ConditionDraft {
  return {
    packaging: condition?.packaging ?? undefined,
    storageConditions: condition?.storageConditions ?? [],
    temperatureType: condition?.temperature?.type,
    temperatureValue: condition?.temperature?.measurement?.value,
    temperatureUnit: condition?.temperature?.measurement?.unit,
    humidityType: condition?.humidity?.type,
    humidityPercentage: condition?.humidity?.percentage ?? undefined,
    light: condition?.light ?? undefined,
    pressureType: condition?.pressure?.type,
    pressureValue: condition?.pressure?.measurement?.value,
    pressureUnit: condition?.pressure?.measurement?.unit,
    specificConditions: condition?.specificConditions ?? undefined,
  };
}
