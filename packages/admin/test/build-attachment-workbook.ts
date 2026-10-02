import {
  ATTACHMENT_FILE_NAME_HEADER,
  ATTACHMENTS_SHEET_NAME,
} from "@projet-igsn/domain/sample/import/attachment-sheet";
import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";

export async function buildAttachmentWorkbook(
  fileNames: readonly (string | null)[] | null,
  name = "samples.xlsx",
): Promise<File> {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.addWorksheet("Samples").addRow(["Sample #", "Name"]);
  if (fileNames !== null) {
    const sheet = book.addWorksheet(ATTACHMENTS_SHEET_NAME);
    sheet.addRow(["Related URL or document"]);
    sheet.addRow(["Sample #", ATTACHMENT_FILE_NAME_HEADER, "Title"]);
    fileNames.forEach((fileName, index) =>
      sheet.addRow([`sample-${index}`, fileName, "A title"]),
    );
  }
  return new File([await book.xlsx.writeBuffer()], name, {
    type: XLSX_MEDIA_TYPE,
  });
}
