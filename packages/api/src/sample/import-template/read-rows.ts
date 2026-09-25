import type {
  ImportIssue,
  ImportIssueCode,
} from "@projet-igsn/domain/sample/import/import-report";
import type ExcelJS from "exceljs";

import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";

import type { Column } from "./columns.ts";
import type { ConditionalCondition } from "./conditional-fields.ts";
import type {
  LayoutColumn,
  LayoutSheet,
  TemplateLayout,
} from "./template-layout.ts";

import { COLUMN_KINDS } from "./column-kind.ts";
import {
  DATA_SHEETS,
  MAX_IMPORT_ROWS,
  plainHeader,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";
import {
  CONDITIONAL_FIELDS,
  conditionOf,
  driverIndexOf,
} from "./conditional-fields.ts";
import { labelOf, resolveLabel } from "./resolve-label.ts";
import { blockIdOf, FIRST_DATA_ROW } from "./workbook.ts";

type Cell = string | Date;

type Json = Record<string, unknown>;

type DataColumn = LayoutColumn & { path: string };

type SheetRow = {
  number: number;
  key: string | undefined;
  cells: ReadonlyMap<DataColumn, Cell>;
};

type Field = { column: Column; path: string; value: unknown };

type Parsed = { value: unknown } | { code: ImportIssueCode };

type Source = { sheet: string; row: number };

export type SampleCandidate = {
  row: number;
  input: Json;
  rowsByPath: Readonly<Record<string, Source>>;
};

const REGION_BLOCK = "region";

const HOUR_PRECISION = "hour";

const isDataColumn = (column: LayoutColumn): column is DataColumn =>
  column.path !== undefined;

const getPath = (object: Json, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value !== null && typeof value === "object"
          ? (value as Json)[key]
          : undefined,
      object,
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

const parentOf = (path: string) => path.split(".").slice(0, -1).join(".");

const textOf = (cell: Cell) =>
  cell instanceof Date ? cell.toISOString() : cell;

function cellValue(cell: ExcelJS.Cell): Cell | undefined {
  const { value } = cell;
  const result =
    value !== null && typeof value === "object" && "result" in value
      ? value.result
      : value;
  if (result instanceof Date) return result;
  const text = cell.text.trim();
  return text === "" ? undefined : text;
}

function sheetRows(
  sheet: ExcelJS.Worksheet,
  columns: readonly LayoutColumn[],
): SheetRow[] {
  const key = columns.find((column) => column.header === SAMPLE_KEY_HEADER);
  const data = columns.filter(isDataColumn);
  const rows: SheetRow[] = [];
  for (let number = FIRST_DATA_ROW; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number);
    const cells = new Map(
      data.flatMap((column) => {
        const value = cellValue(row.getCell(column.number));
        return value === undefined ? [] : [[column, value] as const];
      }),
    );
    if (cells.size === 0) continue;
    const keyValue = key && cellValue(row.getCell(key.number));
    rows.push({
      number,
      key: typeof keyValue === "string" ? keyValue : undefined,
      cells,
    });
  }
  return rows;
}

const templateColumnsOf = (name: string): readonly Column[] =>
  DATA_SHEETS.find((sheet) => sheet.name === name)?.columns ?? [];

const cellOf = (row: SheetRow, matches: (column: DataColumn) => boolean) =>
  [...row.cells].find(([column]) => matches(column))?.[1];

function driverLabel(
  template: readonly Column[],
  row: SheetRow,
  condition: ConditionalCondition,
): string | undefined {
  const cell = cellOf(
    row,
    (candidate) =>
      candidate.path === condition.path && candidate.level === condition.level,
  );
  if (cell === undefined) return undefined;
  const text = textOf(cell);
  const driver = template[driverIndexOf(template, condition)];
  const blockId = driver && blockIdOf(driver);
  if (driver === undefined || blockId === undefined) return text;
  const levels = hierarchiesOf(template).find((candidate) =>
    candidate.includes(driver),
  );
  const resolved =
    levels === undefined
      ? { path: resolveLabel(blockId, "", text) }
      : hierarchyValue(levels.slice(0, condition.level), row);
  const code = "path" in resolved ? resolved.path : undefined;
  return (code && labelOf(blockId, code)) ?? text;
}

function inapplicableColumns(sheet: LayoutSheet, row: SheetRow): DataColumn[] {
  const template = templateColumnsOf(sheet.name);
  return [...row.cells.keys()].filter((column) =>
    CONDITIONAL_FIELDS.some((field) => {
      const condition = conditionOf(field);
      if (condition === undefined || driverIndexOf(template, condition) < 0)
        return false;
      if (!field.paths.some((path) => isPathAtOrUnder(column.path, path)))
        return false;
      const driver = driverLabel(template, row, condition);
      const applies = driver !== undefined && condition.values.includes(driver);
      return condition.match === "is" ? !applies : applies;
    }),
  );
}

const isHourPrecision = (row: SheetRow, path: string) => {
  const precisionPath = `${parentOf(path)}.precision`;
  const precision = cellOf(row, (column) => column.path === precisionPath);
  return (
    precision !== undefined &&
    resolveLabel("date_precision", "", textOf(precision)) === HOUR_PRECISION
  );
};

function flatValue(column: DataColumn, cell: Cell, isHour: boolean): Parsed {
  const type = COLUMN_KINDS.get(column.path)?.type;
  const blockId = blockIdOf(column);
  if (blockId !== undefined) {
    const code = resolveLabel(blockId, "", textOf(cell));
    if (code === undefined) return { code: "unknown_value" };
    if (type === "number") return { value: Number(code) };
    return { value: type === "boolean" ? code === "true" : code };
  }
  if (type === "number") {
    const number = cell instanceof Date ? Number.NaN : Number(cell);
    return Number.isFinite(number)
      ? { value: number }
      : { code: "not_a_number" };
  }
  return {
    value:
      cell instanceof Date
        ? cell.toISOString().slice(0, isHour ? 16 : 10)
        : cell,
  };
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
): { path: string | undefined } | { column: Column; code: ImportIssueCode } {
  let path: string | undefined;
  let isAboveEmpty = false;
  for (const level of levels) {
    const cell = cellOf(row, (column) => column.header === level.header);
    if (cell === undefined) {
      isAboveEmpty = true;
      continue;
    }
    if (isAboveEmpty) return { column: level, code: "parent_level_missing" };
    const next = resolveLabel(blockIdOf(level) ?? "", path ?? "", textOf(cell));
    if (next === undefined) return { column: level, code: "unknown_value" };
    path = next;
  }
  return { path };
}

const hierarchiesOf = (columns: readonly Column[]) =>
  Object.values(
    Object.groupBy(
      columns.filter((column) => column.level !== undefined),
      (column) => column.block ?? "",
    ),
  ).flatMap((levels) => (levels === undefined ? [] : [levels]));

function rowFields(
  sheet: LayoutSheet,
  row: SheetRow,
): { fields: Field[]; issues: ImportIssue[] } {
  const issueAt = (column: Column, code: ImportIssueCode): ImportIssue => ({
    sheet: sheet.name,
    row: row.number,
    column: plainHeader(column),
    code,
  });
  const issues = inapplicableColumns(sheet, row).map((column) =>
    issueAt(column, "not_applicable"),
  );
  const fields: Field[] = [];
  for (const [column, cell] of row.cells) {
    if (column.level !== undefined) continue;
    const parsed = flatValue(
      column,
      cell,
      cell instanceof Date && isHourPrecision(row, column.path),
    );
    if ("code" in parsed) issues.push(issueAt(column, parsed.code));
    else fields.push({ column, path: column.path, value: parsed.value });
  }
  for (const levels of hierarchiesOf(templateColumnsOf(sheet.name))) {
    const [first] = levels;
    const parsed = hierarchyValue(levels, row);
    if ("code" in parsed) issues.push(issueAt(parsed.column, parsed.code));
    else if (first?.path !== undefined && parsed.path !== undefined)
      fields.push(
        first.block === REGION_BLOCK
          ? {
              column: first,
              path: parentOf(first.path),
              value: regionOf(parsed.path),
            }
          : { column: first, path: first.path, value: parsed.path },
      );
  }
  return { fields, issues };
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
    const existing = (getPath(input, prefix) as unknown[] | undefined) ?? [];
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
    const existing = getPath(input, field.path);
    if (existing === undefined) {
      input = setPath(input, field.path, field.value);
      rowsByPath[field.path] = source;
    } else if (existing !== field.value) duplicates.push(field);
  }
  return { sample: { ...sample, input, rowsByPath }, duplicates };
}

const worksheetOf = (book: ExcelJS.Workbook, name: string) => {
  const sheet = book.getWorksheet(name);
  if (sheet === undefined)
    throw new Error(`The layout names a missing sheet ${name}`);
  return sheet;
};

const issueOf = (
  sheet: string,
  row: SheetRow,
  column: string,
  code: ImportIssueCode,
): ImportIssue => ({ sheet, row: row.number, column, code });

function sampleCandidates(
  sheet: LayoutSheet,
  rows: readonly SheetRow[],
): { samples: SampleCandidate[]; issues: ImportIssue[] } {
  const keys = new Set<string>();
  const issues: ImportIssue[] = [];
  const samples = rows.map((row): SampleCandidate => {
    if (row.key === undefined || keys.has(row.key))
      issues.push(
        issueOf(
          sheet.name,
          row,
          SAMPLE_KEY_HEADER,
          row.key === undefined ? "missing_sample_key" : "duplicate_sample_key",
        ),
      );
    if (row.key !== undefined) keys.add(row.key);
    const { fields, issues: rowIssues } = rowFields(sheet, row);
    issues.push(...rowIssues);
    return {
      row: row.number,
      input: fields.reduce<Json>(
        (input, { path, value }) => setPath(input, path, value),
        {},
      ),
      rowsByPath: {},
    };
  });
  return { samples, issues };
}

function joinChildRows(
  samples: readonly SampleCandidate[],
  keys: readonly (string | undefined)[],
  sheet: LayoutSheet,
  rows: readonly SheetRow[],
): { samples: SampleCandidate[]; issues: ImportIssue[] } {
  const joined = [...samples];
  const issues: ImportIssue[] = [];
  for (const row of rows) {
    const { fields, issues: rowIssues } = rowFields(sheet, row);
    const index = row.key === undefined ? -1 : keys.indexOf(row.key);
    const sample = joined[index];
    if (sample === undefined) {
      issues.push(
        issueOf(sheet.name, row, SAMPLE_KEY_HEADER, "unknown_sample_key"),
        ...rowIssues,
      );
      continue;
    }
    const joinedRow = withChildRow(
      sample,
      { sheet: sheet.name, row: row.number },
      fields,
    );
    joined[index] = joinedRow.sample;
    issues.push(
      ...rowIssues,
      ...joinedRow.duplicates.map(({ column }) =>
        issueOf(sheet.name, row, plainHeader(column), "duplicate_value"),
      ),
    );
  }
  return { samples: joined, issues };
}

export function readRows(
  book: ExcelJS.Workbook,
  layout: TemplateLayout,
): { samples: SampleCandidate[]; issues: ImportIssue[] } {
  const [samplesSheet, ...children] = layout;
  if (samplesSheet?.name !== SHEETS.samples)
    throw new Error("The layout does not start with the Samples sheet");
  const rows = sheetRows(
    worksheetOf(book, samplesSheet.name),
    samplesSheet.columns,
  );
  if (rows.length === 0)
    return {
      samples: [],
      issues: [{ sheet: SHEETS.samples, code: "no_sample" }],
    };
  if (rows.length > MAX_IMPORT_ROWS)
    return {
      samples: [],
      issues: [{ sheet: SHEETS.samples, code: "too_many_rows" }],
    };
  const keys = rows.map((row) => row.key);
  return children.reduce(
    (read, child) => {
      const joined = joinChildRows(
        read.samples,
        keys,
        child,
        sheetRows(worksheetOf(book, child.name), child.columns),
      );
      return {
        samples: joined.samples,
        issues: [...read.issues, ...joined.issues],
      };
    },
    sampleCandidates(samplesSheet, rows),
  );
}
