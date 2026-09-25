import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type ExcelJS from "exceljs";

import type { Column } from "./columns.ts";

import {
  DATA_SHEETS,
  plainHeader,
  REQUIRED_MARKER,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";
import { REQUIRED_SAMPLE_COLUMNS } from "./required-columns.ts";
import { HEADER_ROW } from "./workbook.ts";

export type LayoutColumn = Column & { number: number };

export type LayoutSheet = { name: string; columns: readonly LayoutColumn[] };

export type TemplateLayout = readonly LayoutSheet[];

const normalised = (header: string) => {
  const collapsed = header.trim().replace(/\s+/g, " ");
  return (
    collapsed.endsWith(REQUIRED_MARKER)
      ? collapsed.slice(0, -REQUIRED_MARKER.length)
      : collapsed
  ).toLowerCase();
};

function headerNumbers(sheet: ExcelJS.Worksheet): Map<string, number[]> {
  const numbers = new Map<string, number[]>();
  sheet.getRow(HEADER_ROW).eachCell((cell, number) => {
    const header = normalised(cell.text);
    numbers.set(header, [...(numbers.get(header) ?? []), number]);
  });
  return numbers;
}

const isMandatory = (sheet: string, column: Column) =>
  column.header === SAMPLE_KEY_HEADER ||
  (sheet === SHEETS.samples && REQUIRED_SAMPLE_COLUMNS.includes(column));

function sheetLayout(
  name: string,
  columns: readonly Column[],
  sheet: ExcelJS.Worksheet,
): { columns: LayoutColumn[]; issues: ImportIssue[] } {
  const numbers = headerNumbers(sheet);
  const present: LayoutColumn[] = [];
  const issues: ImportIssue[] = [];
  for (const column of columns) {
    const found = numbers.get(normalised(column.header)) ?? [];
    const [number, ...others] = found;
    if (others.length > 0) {
      issues.push({
        sheet: name,
        column: plainHeader(column),
        code: "duplicate_column",
      });
    } else if (number !== undefined) {
      present.push({ ...column, number });
    } else if (isMandatory(name, column)) {
      issues.push({
        sheet: name,
        column: plainHeader(column),
        code: "missing_column",
      });
    }
  }
  return { columns: present, issues };
}

export function templateLayout(book: ExcelJS.Workbook): {
  layout: TemplateLayout;
  issues: ImportIssue[];
} {
  if (book.getWorksheet(SHEETS.samples) === undefined) {
    return {
      layout: [],
      issues: [{ sheet: SHEETS.samples, code: "missing_sheet" }],
    };
  }
  const sheets = DATA_SHEETS.flatMap(({ name, columns }) => {
    const sheet = book.getWorksheet(name);
    return sheet === undefined
      ? []
      : [{ name, ...sheetLayout(name, columns, sheet) }];
  });
  return {
    layout: sheets.map(({ name, columns }) => ({ name, columns })),
    issues: sheets.flatMap((sheet) => sheet.issues),
  };
}
