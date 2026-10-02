import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type ExcelJS from "exceljs";

import {
  HEADER_ROW,
  normalisedHeader,
} from "@projet-igsn/domain/sample/import/template-header";

import type { Column } from "./columns.ts";

import {
  DATA_SHEETS,
  plainHeader,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";
import { REQUIRED_SAMPLE_COLUMNS } from "./required-columns.ts";

export type LayoutColumn = Column & { number: number };

type LayoutSheet = { name: string; columns: readonly LayoutColumn[] };

export type TemplateLayout = readonly LayoutSheet[];

function headerNumbers(sheet: ExcelJS.Worksheet): Map<string, number[]> {
  const numbers = new Map<string, number[]>();
  sheet.getRow(HEADER_ROW).eachCell((cell, number) => {
    const header = normalisedHeader(cell.text);
    numbers.set(header, [...(numbers.get(header) ?? []), number]);
  });
  return numbers;
}

type IsMandatory = (sheet: string, column: Column) => boolean;

type DataSheet = { name: string; columns: readonly Column[] };

const isImportMandatory: IsMandatory = (sheet, column) =>
  column.header === SAMPLE_KEY_HEADER ||
  (sheet === SHEETS.samples && REQUIRED_SAMPLE_COLUMNS.includes(column));

function sheetLayout(
  name: string,
  columns: readonly Column[],
  sheet: ExcelJS.Worksheet,
  isMandatory: IsMandatory,
): { columns: LayoutColumn[]; issues: ImportIssue[] } {
  const numbers = headerNumbers(sheet);
  const present: LayoutColumn[] = [];
  const issues: ImportIssue[] = [];
  for (const column of columns) {
    const found = numbers.get(normalisedHeader(column.header)) ?? [];
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

export function templateLayout(
  book: ExcelJS.Workbook,
  sheets: readonly DataSheet[] = DATA_SHEETS,
  isMandatory: IsMandatory = isImportMandatory,
): {
  layout: TemplateLayout;
  issues: ImportIssue[];
} {
  if (book.getWorksheet(SHEETS.samples) === undefined) {
    return {
      layout: [],
      issues: [{ sheet: SHEETS.samples, code: "missing_sheet" }],
    };
  }
  const present = sheets.flatMap(({ name, columns }) => {
    const sheet = book.getWorksheet(name);
    return sheet === undefined
      ? []
      : [{ name, ...sheetLayout(name, columns, sheet, isMandatory) }];
  });
  return {
    layout: present.map(({ name, columns }) => ({ name, columns })),
    issues: present.flatMap((sheet) => sheet.issues),
  };
}
