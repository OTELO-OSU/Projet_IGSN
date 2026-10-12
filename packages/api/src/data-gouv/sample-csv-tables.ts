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
import { labelOf as catalogNameOf } from "../sample/import-template/resolve-label.ts";

export type ExportFile = { fileName: string; content: string };

type CsvColumn = {
  header: string;
  label: string;
  path: string;
  nameBlock?: string;
};

export type CsvLayout = {
  fileName: string;
  title: string;
  columns: readonly CsvColumn[];
};

const DROPPED_PATHS = new Set([
  MANUAL_GROUP_PATH,
  "repository.currentArchiveContactEmail",
  "localId",
  "localIdDescription",
]);

const REGION_PATH = "location.region.kind";

const INSTITUTION_BLOCKS = new Set(["organization", "osu", "laboratory"]);

const FORMULA_START = /^[=+\-@\t\r]/;

const headerOf = (path: string): string =>
  (path === REGION_PATH ? "location.region" : path)
    .replaceAll(".", "_")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase();

const labelOf = (header: string): string =>
  header.replace(/ \(level \d+\)| \*$/g, "");

const csvColumnsOf = (columns: readonly Column[]): CsvColumn[] =>
  columns.flatMap(({ header, path, level, block }) =>
    path === undefined || DROPPED_PATHS.has(path) || (level ?? 1) !== 1
      ? []
      : [
          { header: headerOf(path), label: labelOf(header), path },
          ...(block !== undefined && INSTITUTION_BLOCKS.has(block)
            ? [
                {
                  header: `${headerOf(path)}_name`,
                  label: `${labelOf(header)} name`,
                  path,
                  nameBlock: block,
                },
              ]
            : []),
        ],
  );

const columnValuesOf = (
  sample: Sample,
  { path, nameBlock }: CsvColumn,
): unknown[] =>
  nameBlock === undefined
    ? valuesOf(sample, path)
    : valuesOf(sample, path).map((code) =>
        typeof code === "string" ? catalogNameOf(nameBlock, code) : undefined,
      );

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

function childRowsOf(sample: Sample, columns: readonly CsvColumn[]): Cell[][] {
  const values = columns.map((column) => columnValuesOf(sample, column));
  const count = Math.max(0, ...values.map((cells) => cells.length));
  return Array.from({ length: count }, (_, row) =>
    values.map((cells) => cellOf([cells[row]])),
  )
    .filter((cells) => cells.some((cell) => cell !== null))
    .map((cells) => [sample.igsn, ...cells]);
}

const fileNameOf = (sheet: string) =>
  `${sheet.toLowerCase().replaceAll(" ", "-")}.csv`;

export const SAMPLES_LAYOUT: CsvLayout = {
  fileName: "samples.csv",
  title: "Samples",
  columns: [
    { header: "igsn", label: "IGSN", path: "igsn" },
    ...csvColumnsOf(
      EXPORT_SAMPLE_COLUMNS.map((column) =>
        column.header === SAMPLE_KEY_HEADER
          ? {
              ...column,
              header: "Internal number, displayed as sample-N",
              path: "internalNumber",
            }
          : column,
      ),
    ).filter(({ path }) => path !== "igsn"),
  ],
};

export const CHILD_LAYOUTS: readonly CsvLayout[] = EXPORT_CHILD_SHEETS.map(
  ({ name, columns }) => ({
    fileName: fileNameOf(name),
    title: name,
    columns: csvColumnsOf(columns),
  }),
);

export function sampleCsvTables(samples: readonly Sample[]): ExportFile[] {
  return [
    {
      fileName: SAMPLES_LAYOUT.fileName,
      content: csvOf([
        SAMPLES_LAYOUT.columns.map(({ header }) => header),
        ...samples.map((sample) =>
          SAMPLES_LAYOUT.columns.map((column) =>
            cellOf(columnValuesOf(sample, column)),
          ),
        ),
      ]),
    },
    ...CHILD_LAYOUTS.map(({ fileName, columns }) => ({
      fileName,
      content: csvOf([
        ["igsn", ...columns.map(({ header }) => header)],
        ...samples.flatMap((sample) => childRowsOf(sample, columns)),
      ]),
    })),
  ];
}
