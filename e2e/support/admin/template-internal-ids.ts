import { FIRST_DATA_ROW, openSamplesSheet } from "./template-workbook.ts";

export async function templateInternalIds(file: string): Promise<unknown[]> {
  const { sheet, columnOf } = await openSamplesSheet(file);
  return sheet
    .getColumn(columnOf("Sample #"))
    .values.slice(FIRST_DATA_ROW)
    .filter((value) => value != null);
}
