import {
  ATTACHMENT_FILE_NAME_HEADER,
  ATTACHMENTS_SHEET_NAME,
} from "@projet-igsn/domain/sample/import/attachment-sheet";

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
  const names = new Set<string>();
  let column: number | undefined;
  sheet.eachRow((row) => {
    if (column === undefined) {
      row.eachCell((cell, number) => {
        if (cell.text.trim() === ATTACHMENT_FILE_NAME_HEADER) column = number;
      });
      return;
    }
    const name = row.getCell(column).text.trim();
    if (name !== "") names.add(name);
  });
  return [...names];
}
