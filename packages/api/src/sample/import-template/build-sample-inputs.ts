import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";

import { formatDate } from "@projet-igsn/domain/date/format-date";
import { parentPath } from "@projet-igsn/domain/sample/path/parent";

import type { Column } from "./columns.ts";
import type { Cell, ParsedRows, RawRow } from "./read-rows.ts";

import { COLUMN_KINDS } from "./column-kind.ts";
import {
  DATA_SHEETS,
  plainHeader,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";
import { textOf } from "./read-rows.ts";
import { resolveLabel } from "./resolve-label.ts";
import { blockIdOf } from "./workbook.ts";

type Json = Record<string, unknown>;

type DataColumn = Column & { path: string };

type SheetRow = { number: number; cells: ReadonlyMap<DataColumn, Cell> };

type Field = { column: Column; path: string; value: unknown };

type Source = { sheet: string; row: number };

export type SampleCandidate = {
  row: number;
  input: Json;
  rowsByPath: Readonly<Record<string, Source>>;
};

const REGION_BLOCK = "region";

const HOUR_PRECISION = "hour";

const isDataColumn = (column: Column): column is DataColumn =>
  column.path !== undefined;

export const valueAt = (value: unknown, keys: readonly string[]): unknown =>
  keys.reduce<unknown>(
    (inner, key) =>
      inner !== null && typeof inner === "object"
        ? (inner as Json)[key]
        : undefined,
    value,
  );

function setPath(object: Json, path: string, value: unknown): Json {
  const [key = "", ...rest] = path.split(".");
  if (rest.length === 0) return { ...object, [key]: value };
  const inner = object[key];
  return {
    ...object,
    [key]: setPath(
      inner !== null && typeof inner === "object" ? (inner as Json) : {},
      rest.join("."),
      value,
    ),
  };
}

const hierarchiesOf = (columns: readonly Column[]) =>
  Object.values(
    Object.groupBy(
      columns.filter((column) => column.level !== undefined),
      (column) => column.block ?? "",
    ),
  ).flatMap((levels) => (levels === undefined ? [] : [levels]));

const TEMPLATES = new Map(
  DATA_SHEETS.map(({ name, columns }) => [
    name,
    {
      dataColumns: columns
        .filter(isDataColumn)
        .map((column) => [column, plainHeader(column)] as const),
      hierarchies: hierarchiesOf(columns),
    },
  ]),
);

const templateOf = (name: string) => {
  const template = TEMPLATES.get(name);
  if (template === undefined) throw new Error(`No template sheet ${name}`);
  return template;
};

function cellOf(row: SheetRow, matches: (column: DataColumn) => boolean) {
  for (const [column, cell] of row.cells) if (matches(column)) return cell;
  return undefined;
}

const issueAt = (
  sheet: string,
  row: number,
  column: string,
  code: ImportIssueCode,
): ImportIssue => ({ sheet, row, column, code });

const isHourPrecision = (row: SheetRow, path: string) => {
  const precisionPath = `${parentPath(path)}.precision`;
  const precision = cellOf(row, (column) => column.path === precisionPath);
  return (
    precision !== undefined &&
    resolveLabel("date_precision", "", textOf(precision)) === HOUR_PRECISION
  );
};

function flatValue(column: DataColumn, cell: Cell, isHour: boolean): unknown {
  const type = COLUMN_KINDS.get(column.path)?.type;
  const blockId = blockIdOf(column);
  if (blockId !== undefined) {
    const code = resolveLabel(blockId, "", textOf(cell));
    if (code === undefined) return textOf(cell);
    if (type === "number") return Number(code);
    return type === "boolean" ? code === "true" : code;
  }
  if (type === "number") {
    const number = cell instanceof Date ? Number.NaN : Number(cell);
    return Number.isFinite(number) ? number : textOf(cell);
  }
  if (!(cell instanceof Date)) return cell;
  return isHour ? cell.toISOString().slice(0, 16) : formatDate(cell);
}

const regionOf = (path: string) => {
  const [kind, code] = path.split(".");
  return code === undefined
    ? { kind }
    : { kind, [kind === "ocean" ? "oceanSea" : "country"]: code };
};

function hierarchyValue(
  levels: readonly Column[],
  row: SheetRow,
): string | undefined {
  let path: string | undefined;
  for (const level of levels) {
    const cell = cellOf(row, (column) => column.header === level.header);
    if (cell === undefined) continue;
    const text = textOf(cell);
    path =
      resolveLabel(blockIdOf(level) ?? "", path ?? "", text) ??
      (path === undefined ? text : `${path}.${text}`);
  }
  return path;
}

function rowFields(sheet: string, row: SheetRow): Field[] {
  const fields: Field[] = [];
  for (const [column, cell] of row.cells) {
    if (column.level !== undefined) continue;
    const isHour = cell instanceof Date && isHourPrecision(row, column.path);
    fields.push({
      column,
      path: column.path,
      value: flatValue(column, cell, isHour),
    });
  }
  for (const levels of templateOf(sheet).hierarchies) {
    const [first] = levels;
    const path = hierarchyValue(levels, row);
    if (first?.path !== undefined && path !== undefined)
      fields.push(
        first.block === REGION_BLOCK
          ? {
              column: first,
              path: parentPath(first.path),
              value: regionOf(path),
            }
          : { column: first, path: first.path, value: path },
      );
  }
  return fields;
}

function withChildRow(
  sample: SampleCandidate,
  source: Source,
  fields: readonly Field[],
): { sample: SampleCandidate; duplicates: Field[] } {
  let { input } = sample;
  const rowsByPath = { ...sample.rowsByPath };
  const duplicates: Field[] = [];
  const elements = Object.groupBy(
    fields,
    (field) => COLUMN_KINDS.get(field.path)?.arrayPrefix ?? "",
  );
  for (const [prefix, members = []] of Object.entries(elements)) {
    if (prefix === "") continue;
    const existing =
      (valueAt(input, prefix.split(".")) as unknown[] | undefined) ?? [];
    const whole = members.find((field) => field.path === prefix);
    const element = whole
      ? whole.value
      : members.reduce<Json>(
          (value, field) =>
            setPath(value, field.path.slice(prefix.length + 1), field.value),
          {},
        );
    input = setPath(input, prefix, [...existing, element]);
    rowsByPath[`${prefix}.${existing.length}`] = source;
  }
  for (const field of elements[""] ?? []) {
    const existing = valueAt(input, field.path.split("."));
    if (existing === undefined) {
      input = setPath(input, field.path, field.value);
      rowsByPath[field.path] = source;
    } else if (existing !== field.value) duplicates.push(field);
  }
  return { sample: { ...sample, input, rowsByPath }, duplicates };
}

const sheetRowOf = (sheet: string, { row, cells }: RawRow): SheetRow => ({
  number: row,
  cells: new Map(
    templateOf(sheet).dataColumns.flatMap(([column, header]) => {
      const cell = cells[header];
      return cell === undefined ? [] : [[column, cell] as const];
    }),
  ),
});

const keyOf = ({ cells }: RawRow) => {
  const key = cells[SAMPLE_KEY_HEADER];
  return typeof key === "string" ? key : undefined;
};

const keyIssue = (sheet: string, { row }: RawRow, code: ImportIssueCode) =>
  issueAt(sheet, row, SAMPLE_KEY_HEADER, code);

export function buildSampleInputs(parsed: ParsedRows): {
  samples: SampleCandidate[];
  issues: ImportIssue[];
} {
  const seen = new Set<string>();
  const issues: ImportIssue[] = [];
  const samples = parsed.samples.map((sample): SampleCandidate => {
    const key = keyOf(sample);
    if (key === undefined)
      issues.push(keyIssue(SHEETS.samples, sample, "missing_sample_key"));
    else if (seen.has(key))
      issues.push(keyIssue(SHEETS.samples, sample, "duplicate_sample_key"));
    else seen.add(key);
    const fields = rowFields(
      SHEETS.samples,
      sheetRowOf(SHEETS.samples, sample),
    );
    let candidate: SampleCandidate = {
      row: sample.row,
      input: fields.reduce<Json>(
        (input, { path, value }) => setPath(input, path, value),
        {},
      ),
      rowsByPath: {},
    };
    for (const child of sample.children) {
      const joined = withChildRow(
        candidate,
        { sheet: child.sheet, row: child.row },
        rowFields(child.sheet, sheetRowOf(child.sheet, child)),
      );
      candidate = joined.sample;
      issues.push(
        ...joined.duplicates.map(({ column }) =>
          issueAt(
            child.sheet,
            child.row,
            plainHeader(column),
            "duplicate_value",
          ),
        ),
      );
    }
    return candidate;
  });
  for (const orphan of parsed.orphans)
    issues.push(keyIssue(orphan.sheet, orphan, "unknown_sample_key"));
  return { samples, issues };
}
