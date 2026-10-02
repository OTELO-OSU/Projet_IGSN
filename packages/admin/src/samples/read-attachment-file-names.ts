import {
  ATTACHMENT_FILE_NAME_HEADER,
  ATTACHMENTS_SHEET_NAME,
} from "@projet-igsn/domain/sample/import/attachment-sheet";
import {
  HEADER_ROW,
  normalisedHeader,
} from "@projet-igsn/domain/sample/import/template-header";

export async function readAttachmentFileNames(file: File): Promise<string[]> {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(await file.arrayBuffer());
  } catch {
    return [];
  }
  const sheet = book.getWorksheet(ATTACHMENTS_SHEET_NAME);
  if (sheet === undefined) return [];
  const fileNameHeader = normalisedHeader(ATTACHMENT_FILE_NAME_HEADER);
  let column: number | undefined;
  sheet.getRow(HEADER_ROW).eachCell((cell, number) => {
    if (normalisedHeader(cell.text) === fileNameHeader) column = number;
  });
  if (column === undefined) return [];
  const fileNameColumn = column;
  const names = new Set<string>();
  sheet.eachRow((row, number) => {
    if (number <= HEADER_ROW) return;
    const name = row.getCell(fileNameColumn).text.trim();
    if (name !== "") names.add(name);
  });
  return [...names];
}
