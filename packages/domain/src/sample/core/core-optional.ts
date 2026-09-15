import { toConcept } from "./concept.ts";
import { toQuantity } from "./quantity.ts";

export const isEmpty = (block: object) =>
  Object.values(block).every((value) => value === undefined);

export const optionalConcept = <S extends string, I extends string>(
  scheme: S,
  id: I | null | undefined,
) => (id == null ? undefined : toConcept(scheme, id));

export const optionalQuantity = <U extends string>(
  measurement: { value: number; unit: U } | null | undefined,
) => (measurement == null ? undefined : toQuantity(measurement));

export const orNull = <V, T>(
  value: V | null | undefined,
  map: (value: NonNullable<V>) => T,
): T | null => (value == null ? null : map(value));
