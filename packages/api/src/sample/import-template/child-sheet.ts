import type ExcelJS from "exceljs";

import type { Column } from "./columns.ts";

import { SAMPLE_KEY_HEADER, SHEETS } from "./columns.ts";
import {
  columnLetter,
  dataRange,
  FIRST_DATA_ROW,
  lastDataRow,
} from "./data-range.ts";
import { addDataSheet } from "./data-sheet.ts";
import { sheetValidations } from "./sheet-validations.ts";

const sampleKeyRange = (rows: number) =>
  `${SHEETS.samples}!$A$${FIRST_DATA_ROW}:$A$${lastDataRow(rows)}`;

type SampleColumn = { letter: string; number: number };

const sampleValueOf = (row: number, { letter, number }: SampleColumn) =>
  `VLOOKUP($A${row}, ${SHEETS.samples}!$A:$${letter}, ${number}, FALSE)`;

const sampleLookupFormula = (
  row: number,
  specificName: SampleColumn | undefined,
) => {
  const name = sampleValueOf(row, { letter: "B", number: 2 });
  if (specificName === undefined) return `IFERROR(${name}, "")`;
  const specific = sampleValueOf(row, specificName);
  return `IFERROR(${name} & IF(${specific} = "", "", " (" & ${specific} & ")"), "")`;
};

export function addChildSheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: number,
  sampleColumns: readonly Column[],
  sampleRows = rows,
) {
  const sheet = addDataSheet(
    book,
    name,
    columns,
    rows,
    undefined,
    undefined,
    sampleColumns,
  );
  const specificNameIndex = sampleColumns.findIndex(
    ({ path }) => path === "specificName",
  );
  const specificName =
    specificNameIndex < 0
      ? undefined
      : {
          letter: columnLetter(sheet, specificNameIndex),
          number: specificNameIndex + 1,
        };
  sheetValidations(sheet).add(dataRange("A", rows), {
    type: "list",
    allowBlank: true,
    formulae: [sampleKeyRange(sampleRows)],
    showInputMessage: true,
    promptTitle: SAMPLE_KEY_HEADER,
    prompt: `The "${SAMPLE_KEY_HEADER}" of the sample this row belongs to, taken from the ${SHEETS.samples} sheet.`,
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: SAMPLE_KEY_HEADER,
    error: `This "${SAMPLE_KEY_HEADER}" is not in the ${SHEETS.samples} sheet.`,
  });
  for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
    sheet.getCell(row, 2).value = {
      formula: sampleLookupFormula(row, specificName),
    };
  }
  return sheet;
}
