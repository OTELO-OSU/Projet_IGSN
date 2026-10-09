import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { Column } from "../import-template/columns.ts";

import { labelOf } from "../import-template/resolve-label.ts";
import { blockIdOf } from "../import-template/workbook.ts";

export type Cell = string | number | null;

const REGION_PATHS = new Set([
  "location.region.kind",
  "location.region.country",
]);

function valuesAt(value: unknown, segments: readonly string[]): unknown[] {
  if (Array.isArray(value)) {
    return segments.length === 0
      ? value
      : value.flatMap((item) => valuesAt(item, segments));
  }
  if (segments.length === 0) return [value];
  if (value === null || typeof value !== "object") return [undefined];
  const [head = "", ...rest] = segments;
  return valuesAt((value as Record<string, unknown>)[head], rest);
}

function regionPathOf(sample: Sample): string | undefined {
  const region = sample.location?.region;
  if (!region) return undefined;
  const code = region.kind === "country" ? region.country : region.oceanSea;
  return code ? `${region.kind}.${code}` : region.kind;
}

const valuesOf = (sample: Sample, path: string | undefined): unknown[] =>
  path === undefined
    ? []
    : REGION_PATHS.has(path)
      ? [regionPathOf(sample)]
      : valuesAt(sample, path.split("."));

function cellOf(column: Column, value: unknown): Cell {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return null;
  }
  const blockId = blockIdOf(column);
  if (blockId === undefined) {
    return typeof value === "number" ? value : String(value);
  }
  const code = String(value);
  const segments = code.split(".");
  if (column.level !== undefined && segments.length < column.level) {
    return null;
  }
  const key =
    column.level === undefined
      ? code
      : segments.slice(0, column.level).join(".");
  return labelOf(blockId, key) ?? key;
}

const joined = (values: unknown[]): unknown =>
  values.length > 1 ? values.join(", ") : values[0];

export const sampleRow = (sample: Sample, columns: readonly Column[]): Cell[] =>
  columns.map((column) =>
    cellOf(column, joined(valuesOf(sample, column.path))),
  );

export function childRows(
  sample: Sample,
  columns: readonly Column[],
): Cell[][] {
  const values = columns.map((column) => valuesOf(sample, column.path));
  const count = Math.max(0, ...values.map((cells) => cells.length));
  return Array.from({ length: count }, (_, row) =>
    columns.map((column, index) => cellOf(column, values[index]?.[row])),
  ).filter((cells) => cells.some((cell) => cell !== null));
}
