import { createRequire } from "node:module";
import path from "node:path";

type Workbook = {
  xlsx: { readFile: (file: string) => Promise<unknown> };
  getWorksheet: (name: string) =>
    | {
        getRow: (row: number) => { values: unknown[] };
        getColumn: (column: number) => { values: unknown[] };
      }
    | undefined;
};

const { Workbook } = createRequire(
  path.join(__dirname, "../../../packages/api/package.json"),
)("exceljs") as { Workbook: new () => Workbook };

const HEADER_ROW = 2;

export async function templateInternalIds(file: string): Promise<unknown[]> {
  const workbook = new Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet("Samples");
  if (!sheet) throw new Error("the template must hold a Samples sheet");
  const column = sheet.getRow(HEADER_ROW).values.indexOf("Sample #");
  return sheet
    .getColumn(column)
    .values.slice(HEADER_ROW + 1)
    .filter((value) => value != null);
}
