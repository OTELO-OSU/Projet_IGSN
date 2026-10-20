import ExcelJS from "exceljs";
import JSZip from "jszip";
import { inflateRawSync } from "node:zlib";

const MAX_WORKBOOK_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;

const STORE = "\x00\x00";

type EntryData = {
  compression?: { magic: string };
  compressedContent: Uint8Array;
};

async function fitsBudget(bytes: ArrayBuffer): Promise<boolean> {
  let left = MAX_WORKBOOK_UNCOMPRESSED_BYTES;
  for (const file of Object.values((await JSZip.loadAsync(bytes)).files)) {
    // shortcut: reads JSZip's private _data (compression, compressedContent), revisit on a jszip major
    const data = (file as unknown as { _data: EntryData })._data;
    if (data.compression === undefined) continue;
    left -=
      data.compression.magic === STORE
        ? data.compressedContent.length
        : inflateRawSync(data.compressedContent, {
            maxOutputLength: Math.max(left, 1),
          }).length;
    if (left < 0) return false;
  }
  return true;
}

export async function openWorkbook(
  bytes: ArrayBuffer,
): Promise<ExcelJS.Workbook | undefined> {
  const book = new ExcelJS.Workbook();
  try {
    if (!(await fitsBudget(bytes))) return undefined;
    await book.xlsx.load(bytes);
  } catch {
    return undefined;
  }
  return book;
}
