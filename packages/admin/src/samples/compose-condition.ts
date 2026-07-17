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
  composeMeasurement,
  type MeasurementCandidate,
} from "#/samples/compose-measurement.ts";

// The Condition tab's flat form draft, mirroring compose-description.ts: every
// field holds its typed value or nullish when unset. The storage conditions
// checkbox group holds an array, empty when nothing is checked.
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

// A condition as composed from the draft, before conditionSchema judges it:
// the Condition shape with possibly missing leaf values (see
// compose-description.ts for the candidate pattern).
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

export function composeCondition(
  draft: ConditionDraft,
): ConditionCandidate | null {
  // A reading's inputs are disabled while its category is unset, so a value
  // lingering after clearing the category is an uneditable leftover, not
  // entered data: the whole reading is dropped (ADR 0015).
  const condition = {
    packaging: draft.packaging ?? undefined,
    storageConditions:
      draft.storageConditions.length > 0 ? draft.storageConditions : undefined,
    temperature: draft.temperatureType
      ? {
          type: draft.temperatureType,
          measurement: composeMeasurement(
            draft.temperatureValue,
            draft.temperatureUnit,
          ),
        }
      : undefined,
    humidity: draft.humidityType
      ? { type: draft.humidityType, percentage: draft.humidityPercentage }
      : undefined,
    light: draft.light ?? undefined,
    pressure: draft.pressureType
      ? {
          type: draft.pressureType,
          measurement: composeMeasurement(
            draft.pressureValue,
            draft.pressureUnit,
          ),
        }
      : undefined,
    specificConditions: draft.specificConditions?.trim() || undefined,
  };
  // All parts unset means no condition at all; undefined values are dropped
  // by JSON on the wire, so the stored shape stays minimal.
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
