import type ExcelJS from "exceljs";

import { HEADER_ROW } from "@projet-igsn/domain/sample/import/template-header";

import type { Column, ColumnGroup } from "./columns.ts";

export const GROUP_ROW = 1;

export const SECTION_COLORS: Partial<
  Record<ColumnGroup, { fill: string; isDark: boolean }>
> = {
  Identity: { fill: "FF45A2E2", isDark: true },
  "Sample classification": { fill: "FFDC5472", isDark: true },
  Location: { fill: "FF508C00", isDark: true },
  "Geological context": { fill: "FF7A6FFF", isDark: true },
  Age: { fill: "FFE54B07", isDark: true },
  "Physical description": { fill: "FFA0522D", isDark: true },
  "Scientific context": { fill: "FFF0A309", isDark: false },
  "Conservation and security": { fill: "FFF4CECC", isDark: false },
  "Curation and repository": { fill: "FFFEF2CC", isDark: false },
};

const WHITE_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" } };

export function styleSections(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  lastRow: number,
) {
  let start = 0;
  for (let index = 1; index <= columns.length; index++) {
    const group = columns[start]?.group;
    if (columns[index]?.group === group) continue;
    if (index - start > 1) {
      sheet.mergeCells(GROUP_ROW, start + 1, GROUP_ROW, index);
    }
    sheet.getCell(GROUP_ROW, start + 1).alignment = { horizontal: "center" };
    const color = group === undefined ? undefined : SECTION_COLORS[group];
    if (color !== undefined) {
      const cells = [sheet.getCell(GROUP_ROW, start + 1)];
      for (let column = start + 1; column <= index; column++) {
        cells.push(sheet.getCell(HEADER_ROW, column));
      }
      for (const cell of cells) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color.fill },
        };
        if (color.isDark) cell.font = WHITE_FONT;
      }
    }
    if (start > 0) {
      for (let row = GROUP_ROW; row <= lastRow; row++) {
        sheet.getCell(row, start + 1).border = { left: { style: "medium" } };
      }
    }
    start = index;
  }
}
