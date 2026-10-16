import type ExcelJS from "exceljs";

import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";

export type ExcelBuffer = Awaited<ReturnType<ExcelJS.Xlsx["writeBuffer"]>>;

export function xlsxResponse(book: ExcelBuffer, filename: string): Response {
  return new Response(book, {
    headers: {
      "Content-Type": XLSX_MEDIA_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
