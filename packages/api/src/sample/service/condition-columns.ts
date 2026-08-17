import type { Condition } from "@projet-igsn/domain/sample/condition/model";

export function conditionColumns(condition: Condition | null | undefined) {
  return {
    packaging: condition?.packaging ?? null,
    storage_conditions: condition?.storageConditions ?? null,
    temperature_type: condition?.temperature?.type ?? null,
    temperature_value: condition?.temperature?.measurement?.value ?? null,
    temperature_unit: condition?.temperature?.measurement?.unit ?? null,
    humidity_type: condition?.humidity?.type ?? null,
    humidity_percentage: condition?.humidity?.percentage ?? null,
    light: condition?.light ?? null,
    pressure_type: condition?.pressure?.type ?? null,
    pressure_value: condition?.pressure?.measurement?.value ?? null,
    pressure_unit: condition?.pressure?.measurement?.unit ?? null,
    specific_conditions: condition?.specificConditions ?? null,
  };
}
