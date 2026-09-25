import {
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import ExcelJS from "exceljs";

import type { Column } from "./columns.ts";
import type { ConditionalCondition } from "./conditional-fields.ts";

import { queueBuild } from "./build-queue.ts";
import {
  CHILD_SHEETS,
  MAX_IMPORT_ROWS,
  SAMPLE_COLUMNS,
  SAMPLE_KEY_HEADER,
  SHEETS,
  TEMPLATE_VERSION,
} from "./columns.ts";
import {
  columnIndexesOf,
  CONDITIONAL_FIELDS,
  conditionalPromptOf,
  conditionOf,
  driverIndexOf,
} from "./conditional-fields.ts";
import { BLOCK_PLACEMENTS, VOCABULARY_ROWS } from "./vocabulary-sheet.ts";

type TemplateValidation = Omit<ExcelJS.DataValidation, "type" | "formulae"> & {
  type: ExcelJS.DataValidation["type"] | "any";
  formulae?: string[];
};

type RangeValidations = {
  add: (range: string, validation: TemplateValidation) => void;
  find: (address: string) => TemplateValidation | undefined;
};

type ExcelBuffer = Awaited<ReturnType<ExcelJS.Xlsx["writeBuffer"]>>;

export const sheetValidations = (sheet: ExcelJS.Worksheet): RangeValidations =>
  (sheet as unknown as { dataValidations: RangeValidations }).dataValidations;

const GROUP_ROW = 1;

export const HEADER_ROW = 2;

export const FIRST_DATA_ROW = HEADER_ROW + 1;

const lastDataRow = (rows: number) => FIRST_DATA_ROW + rows - 1;

const dataRange = (letter: string, rows: number) =>
  `${letter}${FIRST_DATA_ROW}:${letter}${lastDataRow(rows)}`;

const READ_ME_LINES = [
  `Row ${GROUP_ROW} groups the columns as the declaration form's tabs do and row ${HEADER_ROW} names them.`,
  `Fill one sample per row on the "${SHEETS.samples}" sheet, from row ${FIRST_DATA_ROW}.`,
  `"${SAMPLE_KEY_HEADER}" numbers those rows: it is filled for you, so do not edit it.`,
  `A row on ${CHILD_SHEETS.map((child) => `"${child.name}"`).join(", ")} picks that number in its own "${SAMPLE_KEY_HEADER}" list, and the name beside it fills itself.`,
  `Those sheets take one value per row, so a sample with three of them has three rows.`,
  `Dropdowns are a guide, not a rule: the server validates the whole file on upload and refuses it as a whole.`,
  `Leave a cell empty when you have nothing to declare.`,
  `The "${SHEETS.vocabularies}" sheet lists every value the dropdowns offer, with the code the registry stores.`,
  `A header ending in "*" must be filled before the sample can be published.`,
  `A greyed cell does not apply to the row as you filled it, so leave it empty.`,
];

export const blockIdOf = (column: Column): string | undefined =>
  column.block === undefined
    ? undefined
    : column.level === undefined
      ? column.block
      : `${column.block}_${column.level}`;

const columnLetter = (sheet: ExcelJS.Worksheet, index: number) =>
  sheet.getColumn(index + 1).letter;

const sampleKeyRange = (rows: number) =>
  `${SHEETS.samples}!$A$${FIRST_DATA_ROW}:$A$${lastDataRow(rows)}`;

const sampleLookupFormula = (row: number) =>
  `IFERROR(VLOOKUP($A${row}, ${SHEETS.samples}!$A:$B, 2, FALSE), "")`;

const breadcrumbOf = (
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
) =>
  columns
    .flatMap((candidate, index) =>
      candidate.block === column.block &&
      candidate.level !== undefined &&
      candidate.level < (column.level ?? 0)
        ? [`$${columnLetter(sheet, index)}${FIRST_DATA_ROW}`]
        : [],
    )
    .join('&">"&');

function vocabularyValidationOf(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
): TemplateValidation | undefined {
  const blockId = blockIdOf(column);
  const placement =
    blockId === undefined ? undefined : BLOCK_PLACEMENTS[blockId];
  if (placement === undefined) return undefined;
  const { title, keyRange, labelAnchor, labelRange } = placement;
  let formula = `=${labelRange}`;
  let follows = "";
  if ((column.level ?? 1) > 1) {
    const breadcrumb = breadcrumbOf(sheet, columns, column);
    formula = `=OFFSET(${labelAnchor},MATCH(${breadcrumb},${keyRange},0)-1,0,COUNTIF(${keyRange},${breadcrumb}),1)`;
    follows = ", which follows the level above";
  }
  return {
    type: "list",
    allowBlank: true,
    formulae: [formula],
    showInputMessage: true,
    promptTitle: title,
    prompt: `Pick a value from the list${follows}. Full list in the "${title}" block of the ${SHEETS.vocabularies} sheet.`,
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: title,
    error: `This value is not in the list. Keep it only if you are sure: the server checks it on upload.`,
  };
}

function validationOf(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
): TemplateValidation | undefined {
  const base = vocabularyValidationOf(sheet, columns, column);
  const condition =
    column.path === undefined ? undefined : conditionalPromptOf(column.path);
  if (condition === undefined) return base;
  if (base === undefined) {
    return {
      type: "any",
      showInputMessage: true,
      promptTitle: column.header,
      prompt: condition,
    };
  }
  return { ...base, prompt: `${base.prompt} ${condition}` };
}

const GREY_FILL = {
  fill: {
    type: "pattern",
    pattern: "solid",
    bgColor: { argb: "FFD9D9D9" },
  },
} as const satisfies Partial<ExcelJS.Style>;

const greyFormula = (letter: string, condition: ConditionalCondition) => {
  const cell = `$${letter}${FIRST_DATA_ROW}`;
  const applies = `OR(${condition.values
    .map((value) => `${cell}="${value}"`)
    .join(",")})`;
  return condition.match === "isNot" ? applies : `NOT(${applies})`;
};

function addGreyRules(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  rows: number,
) {
  let priority = 1;
  for (const field of CONDITIONAL_FIELDS) {
    const condition = conditionOf(field);
    if (condition === undefined) continue;
    const driverIndex = driverIndexOf(columns, condition);
    if (driverIndex < 0) continue;
    const formula = greyFormula(columnLetter(sheet, driverIndex), condition);
    for (const index of field.paths.flatMap((path) =>
      columnIndexesOf(columns, path),
    )) {
      sheet.addConditionalFormatting({
        ref: dataRange(columnLetter(sheet, index), rows),
        rules: [
          {
            type: "expression",
            priority: priority++,
            formulae: [formula],
            style: GREY_FILL,
          },
        ],
      });
    }
  }
}

function mergeGroupRow(sheet: ExcelJS.Worksheet, columns: readonly Column[]) {
  let start = 0;
  for (let index = 1; index <= columns.length; index++) {
    if (columns[index]?.group === columns[start]?.group) continue;
    if (index - start > 1) {
      sheet.mergeCells(GROUP_ROW, start + 1, GROUP_ROW, index);
    }
    sheet.getCell(GROUP_ROW, start + 1).alignment = { horizontal: "center" };
    start = index;
  }
}

function addDataSheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: number,
) {
  const sheet = book.addWorksheet(name);
  sheet.columns = columns.map((column) => ({
    header: [column.group, column.header],
    width: Math.min(44, Math.max(14, column.header.length + 2)),
    outlineLevel: column.path?.includes(".") ? 1 : 0,
  }));
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: HEADER_ROW }];
  mergeGroupRow(sheet, columns);
  for (const [index, column] of columns.entries()) {
    const validation = validationOf(sheet, columns, column);
    if (validation === undefined) continue;
    sheetValidations(sheet).add(
      dataRange(columnLetter(sheet, index), rows),
      validation,
    );
  }
  addGreyRules(sheet, columns, rows);
  return sheet;
}

function addChildSheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: number,
) {
  const sheet = addDataSheet(book, name, columns, rows);
  sheetValidations(sheet).add(dataRange("A", rows), {
    type: "list",
    allowBlank: true,
    formulae: [`=${sampleKeyRange(rows)}`],
    showInputMessage: true,
    promptTitle: SAMPLE_KEY_HEADER,
    prompt: `The number of the sample this row belongs to, taken from the ${SHEETS.samples} sheet.`,
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: SAMPLE_KEY_HEADER,
    error: `This sample number is not in the ${SHEETS.samples} sheet.`,
  });
  for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
    sheet.getCell(row, 2).value = { formula: sampleLookupFormula(row) };
  }
}

function addReadMeSheet(book: ExcelJS.Workbook) {
  const sheet = book.addWorksheet(SHEETS.readMe);
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 120;
  sheet.getCell("A1").value = "IGSN sample import template";
  sheet.getCell("B1").value = TEMPLATE_VERSION;
  sheet.getCell("A2").value = "Generated on";
  sheet.getCell("B2").value = new Date().toISOString().slice(0, 10);
  for (const [index, line] of READ_ME_LINES.entries()) {
    sheet.getCell(`B${index + 4}`).value = line;
  }
}

async function addVocabularySheet(book: ExcelJS.Workbook) {
  const sheet = book.addWorksheet(SHEETS.vocabularies);
  sheet.addRows(VOCABULARY_ROWS.map((row) => [...row]));
  for (const index of [1, 2, 3]) sheet.getColumn(index).width = 52;
  await sheet.protect("", {});
}

async function build(rows: number): Promise<ExcelBuffer> {
  const book = new ExcelJS.Workbook();
  addReadMeSheet(book);
  const samples = addDataSheet(book, SHEETS.samples, SAMPLE_COLUMNS, rows);
  for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
    samples.getCell(row, 1).value = row - FIRST_DATA_ROW + 1;
  }
  for (const child of CHILD_SHEETS) {
    addChildSheet(book, child.name, child.columns, rows);
  }
  await addVocabularySheet(book);
  return book.xlsx.writeBuffer();
}

export function importTemplateWorkbook(
  rows: number = MAX_IMPORT_ROWS,
): Promise<ExcelBuffer> {
  return queueBuild(() => build(rows));
}

export async function importTemplateResponse(rows: number): Promise<Response> {
  return new Response(await importTemplateWorkbook(rows), {
    headers: {
      "Content-Type": XLSX_MEDIA_TYPE,
      "Content-Disposition": `attachment; filename="${IMPORT_TEMPLATE_FILENAME}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
