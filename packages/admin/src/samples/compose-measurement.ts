export type MeasurementCandidate<Unit> = {
  value: number;
  unit: Unit | undefined;
};

export const composeMeasurement = <Unit extends string>(
  value: number | undefined,
  unit: Unit | null | undefined,
): MeasurementCandidate<Unit> | undefined =>
  hasMeasurementValue(value) ? { value, unit: unit ?? undefined } : undefined;

export const hasMeasurementValue = (
  value: number | undefined,
): value is number => value !== undefined;
