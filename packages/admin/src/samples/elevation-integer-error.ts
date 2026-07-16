import { m } from "#/paraglide/messages.js";

// Domain elevations are whole units (locationSchema requires int); surface the
// rule as the user types instead of failing silently on submit.
export const elevationIntegerError = (
  value: number | undefined,
): { message: string } | undefined =>
  value !== undefined && !Number.isInteger(value)
    ? { message: m.field_elevation_integer() }
    : undefined;
