import ExcelJS from "exceljs";

import { fitsUnzippedCap } from "./unzipped-size.ts";

export async function openWorkbook(
  bytes: ArrayBuffer,
): Promise<ExcelJS.Workbook | undefined> {
  if (!fitsUnzippedCap(new Uint8Array(bytes))) return undefined;
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(bytes);
  } catch {
    return undefined;
  }
  return book;
}
