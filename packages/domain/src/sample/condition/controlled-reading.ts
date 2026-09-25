import type { StorageCondition } from "./storage-condition.ts";

export const READING_STORAGE_CONDITION = {
  temperature: "temperature_controlled",
  pressure: "pressure_controlled",
  humidity: "moisture_controlled",
  light: "light_controlled",
} as const satisfies Record<string, StorageCondition>;

export type ControlledReading = keyof typeof READING_STORAGE_CONDITION;

export const CONTROLLED_READINGS = Object.keys(
  READING_STORAGE_CONDITION,
) as ControlledReading[];

export const hasStorageCondition = (
  storageConditions: readonly StorageCondition[] | null | undefined,
): boolean => (storageConditions?.length ?? 0) > 0;

export const isReadingControlled = (
  storageConditions: readonly StorageCondition[] | null | undefined,
  reading: ControlledReading,
): boolean =>
  storageConditions?.includes(READING_STORAGE_CONDITION[reading]) ?? false;
