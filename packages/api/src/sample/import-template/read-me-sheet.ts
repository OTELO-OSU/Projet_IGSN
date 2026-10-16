import type ExcelJS from "exceljs";

import { SHEETS, TEMPLATE_VERSION } from "./columns.ts";

export function addReadMeSheet(
  book: ExcelJS.Workbook,
  title: string,
  lines: readonly string[],
) {
  const sheet = book.addWorksheet(SHEETS.readMe);
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 120;
  sheet.getCell("A1").value = title;
  sheet.getCell("B1").value = TEMPLATE_VERSION;
  sheet.getCell("A2").value = "Generated on";
  sheet.getCell("B2").value = new Date().toISOString().slice(0, 10);
  for (const [index, line] of lines.entries()) {
    sheet.getCell(`B${index + 4}`).value = line;
  }
  return sheet;
}
