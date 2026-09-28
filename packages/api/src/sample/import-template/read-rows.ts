import type ExcelJS from "exceljs";

import type { LayoutColumn, TemplateLayout } from "./template-layout.ts";

import { plainHeader, SAMPLE_KEY_HEADER, SHEETS } from "./columns.ts";
import { FIRST_DATA_ROW } from "./workbook.ts";

export type Cell = string | Date;

export type RawRow = { row: number; cells: Readonly<Record<string, Cell>> };

type ChildRow = RawRow & { sheet: string };

type ParsedSample = RawRow & { children: ChildRow[] };

export type ParsedRows = { samples: ParsedSample[]; orphans: ChildRow[] };

export const textOf = (cell: Cell) =>
  cell instanceof Date ? cell.toISOString() : cell;

export function cellValue(cell: ExcelJS.Cell): Cell | undefined {
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
): RawRow[] {
  const rows: RawRow[] = [];
  sheet.eachRow((row, number) => {
    if (number < FIRST_DATA_ROW) return;
    const filled = columns.flatMap((column) => {
      const value = cellValue(row.getCell(column.number));
      return value === undefined ? [] : [{ column, value }];
    });
    if (filled.every(({ column }) => column.path === undefined)) return;
    rows.push({
      row: number,
      cells: Object.fromEntries(
        filled.map(({ column, value }) => [plainHeader(column), value]),
      ),
    });
  });
  return rows;
}

const worksheetOf = (book: ExcelJS.Workbook, name: string) => {
  const sheet = book.getWorksheet(name);
  if (sheet === undefined)
    throw new Error(`The layout names a missing sheet ${name}`);
  return sheet;
};

export function readRows(
  book: ExcelJS.Workbook,
  layout: TemplateLayout,
): ParsedRows {
  const [samplesSheet, ...children] = layout;
  if (samplesSheet?.name !== SHEETS.samples)
    throw new Error("The layout does not start with the Samples sheet");
  const samples = sheetRows(
    worksheetOf(book, samplesSheet.name),
    samplesSheet.columns,
  ).map((row): ParsedSample => ({ ...row, children: [] }));
  const byKey = new Map<Cell, ParsedSample>();
  for (const sample of samples) {
    const key = sample.cells[SAMPLE_KEY_HEADER];
    if (key !== undefined && !byKey.has(key)) byKey.set(key, sample);
  }
  const orphans: ChildRow[] = [];
  for (const child of children) {
    for (const row of sheetRows(worksheetOf(book, child.name), child.columns)) {
      const key = row.cells[SAMPLE_KEY_HEADER];
      const sample = key === undefined ? undefined : byKey.get(key);
      (sample?.children ?? orphans).push({ sheet: child.name, ...row });
    }
  }
  return { samples, orphans };
}
