// A value/unit candidate as composed from a flat draft, before the domain
// schema judges it: compose does not decide completeness, the schema rejects
// a half-filled pair on the offending field.
export type MeasurementCandidate<Unit> = {
  value: number | undefined;
  unit: Unit | undefined;
};

// A pair flows through once either half is set, so the schema can flag the
// missing half; both halves unset means the measurement was not entered.
export const composeMeasurement = <Unit extends string>(
  value: number | undefined,
  unit: Unit | null | undefined,
): MeasurementCandidate<Unit> | undefined =>
  value === undefined && !unit ? undefined : { value, unit: unit ?? undefined };
