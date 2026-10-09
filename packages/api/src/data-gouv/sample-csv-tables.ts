import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { Cell } from "../sample/bulk-edit/sample-row.ts";
import type { Column } from "../sample/import-template/columns.ts";

import {
  EXPORT_CHILD_SHEETS,
  EXPORT_SAMPLE_COLUMNS,
} from "../sample/bulk-edit/export-columns.ts";
import { valuesOf } from "../sample/bulk-edit/sample-row.ts";
import {
  MANUAL_GROUP_PATH,
  SAMPLE_KEY_HEADER,
} from "../sample/import-template/columns.ts";

export type CsvTable = { fileName: string; csv: string };

const DROPPED_PATHS = new Set([
  MANUAL_GROUP_PATH,
  "repository.currentArchiveContactEmail",
  "localId",
  "localIdDescription",
]);

const REGION_PATH = "location.region.kind";

const FORMULA_START = /^[=+\-@\t\r]/;

const pathsOf = (columns: readonly Column[]): string[] =>
  columns.flatMap(({ path, level }) =>
    path === undefined || DROPPED_PATHS.has(path) || (level ?? 1) !== 1
      ? []
      : [path],
  );

const headerOf = (path: string) =>
  path === REGION_PATH ? "location.region" : path;

function cellOf(values: readonly unknown[]): Cell {
  const scalars = values.filter(
    (value) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean",
  );
  const [only] = scalars;
  if (only === undefined) return null;
  return scalars.length === 1 && typeof only === "number"
    ? only
    : scalars.map(String).join("|");
}

function fieldOf(cell: Cell): string {
  if (cell === null) return "";
  if (typeof cell === "number") return String(cell);
  const text = FORMULA_START.test(cell) ? `'${cell}` : cell;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csvOf = (rows: readonly (readonly Cell[])[]): string =>
  rows.map((row) => `${row.map(fieldOf).join(",")}\r\n`).join("");

function childRowsOf(sample: Sample, paths: readonly string[]): Cell[][] {
  const values = paths.map((path) => valuesOf(sample, path));
  const count = Math.max(0, ...values.map((cells) => cells.length));
  return Array.from({ length: count }, (_, row) =>
    values.map((cells) => cellOf([cells[row]])),
  )
    .filter((cells) => cells.some((cell) => cell !== null))
    .map((cells) => [sample.igsn, ...cells]);
}

const fileNameOf = (sheet: string) =>
  `${sheet.toLowerCase().replaceAll(" ", "-")}.csv`;

export function sampleCsvTables(samples: readonly Sample[]): CsvTable[] {
  const samplePaths = pathsOf(
    EXPORT_SAMPLE_COLUMNS.map((column) =>
      column.header === SAMPLE_KEY_HEADER
        ? { ...column, path: "internalNumber" }
        : column,
    ),
  );
  return [
    {
      fileName: "samples.csv",
      csv: csvOf([
        samplePaths.map(headerOf),
        ...samples.map((sample) =>
          samplePaths.map((path) => cellOf(valuesOf(sample, path))),
        ),
      ]),
    },
    ...EXPORT_CHILD_SHEETS.map(({ name, columns }) => {
      const paths = pathsOf(columns);
      return {
        fileName: fileNameOf(name),
        csv: csvOf([
          ["igsn", ...paths],
          ...samples.flatMap((sample) => childRowsOf(sample, paths)),
        ]),
      };
    }),
  ];
}
