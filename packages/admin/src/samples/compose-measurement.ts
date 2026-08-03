// A value/unit candidate as composed from a flat draft, before the domain
// schema judges it: the value flows through without its unit so the schema
// flags the missing unit on the visible unit control.
export type MeasurementCandidate<Unit> = {
  value: number;
  unit: Unit | undefined;
};

// A unit without a value is the leftover of a cleared value, and its control is
// hidden, so it is dropped rather than pinning an unfixable error on an
// invisible field (ADR 0015).
export const composeMeasurement = <Unit extends string>(
  value: number | undefined,
  unit: Unit | null | undefined,
): MeasurementCandidate<Unit> | undefined =>
  hasMeasurementValue(value) ? { value, unit: unit ?? undefined } : undefined;

export const hasMeasurementValue = (
  value: number | undefined,
): value is number => value !== undefined;
