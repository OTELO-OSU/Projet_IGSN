import { createRequire } from "node:module";
import path from "node:path";

type Sheet = {
  getRow: (row: number) => { values: unknown[] };
  getColumn: (column: number) => { values: unknown[] };
  getCell: (row: number, column: number) => { value: unknown };
};

type Workbook = {
  xlsx: {
    readFile: (file: string) => Promise<unknown>;
    writeFile: (file: string) => Promise<void>;
  };
  getWorksheet: (name: string) => Sheet | undefined;
};

const { Workbook } = createRequire(
  path.join(__dirname, "../../../packages/api/package.json"),
)("exceljs") as { Workbook: new () => Workbook };

const HEADER_ROW = 2;

export const FIRST_DATA_ROW = HEADER_ROW + 1;

const REQUIRED_MARKER = " *";

export async function openSamplesSheet(file: string) {
  const book = new Workbook();
  await book.xlsx.readFile(file);
  const sheet = book.getWorksheet("Samples");
  if (!sheet) throw new Error("the template must hold a Samples sheet");
  const headers = sheet
    .getRow(HEADER_ROW)
    .values.map((value) =>
      typeof value === "string" ? value.replace(REQUIRED_MARKER, "") : value,
    );
  const columnOf = (header: string) => {
    const column = headers.indexOf(header);
    if (column === -1) throw new Error(`the template has no ${header} column`);
    return column;
  };
  return { book, sheet, columnOf };
}

export async function fillTemplateSample(
  file: string,
  cells: Record<string, unknown>,
): Promise<void> {
  const { book, sheet, columnOf } = await openSamplesSheet(file);
  for (const [header, value] of Object.entries(cells)) {
    sheet.getCell(FIRST_DATA_ROW, columnOf(header)).value = value;
  }
  await book.xlsx.writeFile(file);
}
