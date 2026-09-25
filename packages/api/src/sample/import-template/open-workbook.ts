import ExcelJS from "exceljs";

export async function openWorkbook(
  bytes: ArrayBuffer,
): Promise<ExcelJS.Workbook | undefined> {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(bytes);
  } catch {
    return undefined;
  }
  return book;
}
