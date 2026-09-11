import { atomizeChangeset, diff } from "json-diff-ts";

const hasNoValue = (value: unknown): boolean =>
  value == null || (Array.isArray(value) && value.length === 0);

export function changedPaths(current: object, next: object): string[] {
  return atomizeChangeset(diff(current, next))
    .filter(
      ({ key, value, oldValue }) =>
        key !== "id" && !(hasNoValue(value) && hasNoValue(oldValue)),
    )
    .map(({ path }) => path.replace("$.", "").replace(/\[(\d+)\]/g, ".$1"));
}
