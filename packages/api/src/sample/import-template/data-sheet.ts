import type ExcelJS from "exceljs";

import { HEADER_ROW } from "@projet-igsn/domain/sample/import/template-header";

import type { Placements } from "./column-validation.ts";
import type { Column } from "./columns.ts";

import { validationOf } from "./column-validation.ts";
import {
  columnLetter,
  dataRange,
  FIRST_DATA_ROW,
  lastDataRow,
} from "./data-range.ts";
import { addGreyRules } from "./grey-rules.ts";
import { styleSections } from "./section-style.ts";
import { sheetValidations } from "./sheet-validations.ts";
import { BLOCK_PLACEMENTS } from "./vocabulary-sheet.ts";

export const FROZEN_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

export function addDataSheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: number,
  prefill?: (column: Column) => string | undefined,
  placements: Placements = BLOCK_PLACEMENTS,
) {
  const sheet = book.addWorksheet(name);
  sheet.columns = columns.map((column) => ({
    header: [column.group, column.header],
    width: Math.min(44, Math.max(14, column.header.length + 2)),
    outlineLevel: column.path?.includes(".") ? 1 : 0,
  }));
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: HEADER_ROW }];
  styleSections(sheet, columns, lastDataRow(rows));
  for (const [index, column] of columns.entries()) {
    const label = prefill?.(column);
    if (label !== undefined) {
      for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
        const cell = sheet.getCell(row, index + 1);
        cell.value = label;
        cell.fill = FROZEN_FILL;
      }
      continue;
    }
    const validation = validationOf(sheet, columns, column, placements);
    if (validation === undefined) continue;
    sheetValidations(sheet).add(
      dataRange(columnLetter(sheet, index), rows),
      validation,
    );
  }
  addGreyRules(sheet, columns, rows);
  return sheet;
}
