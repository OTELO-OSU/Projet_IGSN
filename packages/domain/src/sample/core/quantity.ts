import { z } from "zod";

import { experimentDurationUnitLabel } from "../synthetic-details/experiment-duration-unit.ts";

const UCUM_BY_UNIT: Record<string, string> = {
  ml: "mL",
  l: "L",
  celsius: "Cel",
  fahrenheit: "[degF]",
  kelvin: "K",
  mmhg: "mm[Hg]",
  kbar: "bar",
  gpa: "Pa",
  pa: "Pa",
  ...experimentDurationUnitLabel,
};

// Core v0.10.0 asks for pressures in bar and Pa, so kbar and GPa convert.
const UCUM_EXPONENT: Record<string, number> = { kbar: 3, gpa: 9 };

function ucumCode(unit: string): string {
  return UCUM_BY_UNIT[unit] ?? unit;
}

// ponytail: decimal-exponent scaling keeps 1.1 kbar exactly, falling back to a
// multiplication for a value already written in exponential notation
function shift(value: number, exponent: number): number {
  const decimal = `${value}`;
  return decimal.includes("e")
    ? value * 10 ** exponent
    : Number(`${decimal}e${exponent}`);
}

const isUcumConsistent = (quantity: unknown): boolean => {
  const { unitCode, unitLabel } = quantity as {
    unitCode: string;
    unitLabel: string;
  };
  return unitCode === ucumCode(unitLabel);
};

export const quantitySchema = <T extends z.ZodType<string>>(unit: T) =>
  z
    .strictObject({
      value: z.number(),
      unitCode: z.string().min(1),
      unitLabel: unit,
    })
    .refine(isUcumConsistent, {
      path: ["unitCode"],
      error: "unitCode must be the UCUM code of unitLabel",
    });

export function toQuantity<U extends string>(measurement: {
  value: number;
  unit: U;
}): { value: number; unitCode: string; unitLabel: U } {
  return {
    value: shift(measurement.value, UCUM_EXPONENT[measurement.unit] ?? 0),
    unitCode: ucumCode(measurement.unit),
    unitLabel: measurement.unit,
  };
}

export function fromQuantity<U extends string>(quantity: {
  value: number;
  unitLabel: U;
}): { value: number; unit: U } {
  return {
    value: shift(quantity.value, -(UCUM_EXPONENT[quantity.unitLabel] ?? 0)),
    unit: quantity.unitLabel,
  };
}
