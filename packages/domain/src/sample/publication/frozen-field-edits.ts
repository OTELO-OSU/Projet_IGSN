import type { CreateSample } from "../sample.ts";

import { changedPaths } from "../changed-paths.ts";

type Unknowns = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Unknowns =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

function fillOmitted(incoming: Unknowns, merged: Unknowns): Unknowns {
  const filled: Unknowns = { ...incoming };
  for (const [key, mergedValue] of Object.entries(merged)) {
    const value = incoming[key];
    filled[key] =
      value === undefined
        ? mergedValue
        : isPlainObject(value) && isPlainObject(mergedValue)
          ? fillOmitted(value, mergedValue)
          : value;
  }
  return filled;
}

export function frozenFieldEdits(
  incoming: CreateSample,
  merged: CreateSample,
): string[] {
  return changedPaths(fillOmitted(incoming, merged), merged);
}
