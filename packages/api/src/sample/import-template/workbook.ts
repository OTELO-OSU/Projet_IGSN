import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { TemplateSectionKey } from "@projet-igsn/domain/sample/import/import-validator";

import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import {
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { HEADER_ROW } from "@projet-igsn/domain/sample/import/template-header";
import ExcelJS from "exceljs";

import type { Column, ColumnGroup } from "./columns.ts";
import type { ConditionalCondition } from "./conditional-fields.ts";
import type {
  StoredCustomization,
  TemplateCustomization,
} from "./customization.ts";
import type { BlockPlacement } from "./vocabulary-sheet.ts";

import { queueBuild } from "./build-queue.ts";
import {
  CHILD_SHEETS,
  SAMPLE_COLUMNS,
  SAMPLE_KEY_HEADER,
  SHEETS,
  TEMPLATE_SECTIONS,
  TEMPLATE_VERSION,
} from "./columns.ts";
import {
  columnIndexesOf,
  CONDITIONAL_FIELDS,
  conditionalPromptOf,
  conditionOf,
  driverIndexOf,
} from "./conditional-fields.ts";
import {
  defaultLabelOf,
  droppedColumnsOf,
  hasCustomization,
  prefillOf,
  storedCustomizationOf,
  writeCustomization,
} from "./customization.ts";
import {
  BLOCK_PLACEMENTS,
  manualGroupBlock,
  VOCABULARY_BLOCKS,
  VOCABULARY_ROWS,
  vocabularyLayout,
} from "./vocabulary-sheet.ts";

type Placements = Readonly<Record<string, BlockPlacement>>;

type TemplateValidation = Omit<ExcelJS.DataValidation, "type" | "formulae"> & {
  type: ExcelJS.DataValidation["type"] | "any";
  formulae?: string[];
};

type RangeValidations = {
  add: (range: string, validation: TemplateValidation) => void;
  find: (address: string) => TemplateValidation | undefined;
};

export type ExcelBuffer = Awaited<ReturnType<ExcelJS.Xlsx["writeBuffer"]>>;

export const sheetValidations = (sheet: ExcelJS.Worksheet): RangeValidations =>
  (sheet as unknown as { dataValidations: RangeValidations }).dataValidations;

const GROUP_ROW = 1;

export const FIRST_DATA_ROW = HEADER_ROW + 1;

const lastDataRow = (rows: number) => FIRST_DATA_ROW + rows - 1;

const dataRange = (letter: string, rows: number) =>
  `${letter}${FIRST_DATA_ROW}:${letter}${lastDataRow(rows)}`;

const READ_ME_LINES = [
  `Row ${GROUP_ROW} groups the columns as the declaration form's tabs do and row ${HEADER_ROW} names them.`,
  `Fill one sample per row on the "${SHEETS.samples}" sheet, from row ${FIRST_DATA_ROW}.`,
  `"${SAMPLE_KEY_HEADER}" numbers those rows: it is filled for you, so do not edit it.`,
  `A "${SAMPLE_KEY_HEADER}" reserved when downloading this template becomes that sample's internal ID; a plain number gets the next free one on import.`,
  `A row on ${CHILD_SHEETS.map((child) => `"${child.name}"`).join(", ")} picks that number in its own "${SAMPLE_KEY_HEADER}" list, and the name beside it fills itself.`,
  `Those sheets take one value per row, so a sample with three of them has three rows.`,
  `A row on "${SHEETS.attachments}" names a file you must provide when importing; several rows may name the same file, and names match exactly, case included.`,
  `Dropdowns are a guide, not a rule: the server validates the whole file on upload and refuses it as a whole.`,
  `Leave a cell empty when you have nothing to declare.`,
  `The "${SHEETS.vocabularies}" sheet lists every value the dropdowns offer, with the code the registry stores.`,
  `A header ending in "*" must be filled before the sample can be published.`,
  `A greyed cell does not apply to the row as you filled it, so leave it empty.`,
];

const CUSTOMIZED_READ_ME_LINE = `A grey pre-filled column was fixed when this template was generated, so do not edit it.`;

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
  placements: Placements,
): TemplateValidation | undefined {
  const blockId = blockIdOf(column);
  const placement = blockId === undefined ? undefined : placements[blockId];
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
  placements: Placements,
): TemplateValidation | undefined {
  const base = vocabularyValidationOf(sheet, columns, column, placements);
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

export const FROZEN_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

const greyFormula = (letter: string, condition: ConditionalCondition) => {
  const cell = `$${letter}${FIRST_DATA_ROW}`;
  if (condition.match === "isEmpty") return `NOT(${cell}="")`;
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

export function addDataSheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: number,
  prefill?: (column: Column) => string | undefined,
  placements: Placements = BLOCK_PLACEMENTS,
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
    const label = prefill?.(column);
    if (label !== undefined) {
      for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
        const cell = sheet.getCell(row, index + 1);
        cell.value = label;
        cell.fill = FROZEN_FILL;
      }
      continue;
    }
    const validation = validationOf(sheet, columns, column, placements);
    if (validation === undefined) continue;
    sheetValidations(sheet).add(
      dataRange(columnLetter(sheet, index), rows),
      validation,
    );
  }
  addGreyRules(sheet, columns, rows);
  return sheet;
}

export function addChildSheet(
  book: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: number,
  sampleRows = rows,
) {
  const sheet = addDataSheet(book, name, columns, rows);
  sheetValidations(sheet).add(dataRange("A", rows), {
    type: "list",
    allowBlank: true,
    formulae: [`=${sampleKeyRange(sampleRows)}`],
    showInputMessage: true,
    promptTitle: SAMPLE_KEY_HEADER,
    prompt: `The "${SAMPLE_KEY_HEADER}" of the sample this row belongs to, taken from the ${SHEETS.samples} sheet.`,
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: SAMPLE_KEY_HEADER,
    error: `This "${SAMPLE_KEY_HEADER}" is not in the ${SHEETS.samples} sheet.`,
  });
  for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
    sheet.getCell(row, 2).value = { formula: sampleLookupFormula(row) };
  }
  return sheet;
}

export function addReadMeSheet(
  book: ExcelJS.Workbook,
  title: string,
  lines: readonly string[],
) {
  const sheet = book.addWorksheet(SHEETS.readMe);
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 120;
  sheet.getCell("A1").value = title;
  sheet.getCell("B1").value = TEMPLATE_VERSION;
  sheet.getCell("A2").value = "Generated on";
  sheet.getCell("B2").value = new Date().toISOString().slice(0, 10);
  for (const [index, line] of lines.entries()) {
    sheet.getCell(`B${index + 4}`).value = line;
  }
  return sheet;
}

export function addVocabularySheet(
  book: ExcelJS.Workbook,
  rows: typeof VOCABULARY_ROWS = VOCABULARY_ROWS,
) {
  const sheet = book.addWorksheet(SHEETS.vocabularies);
  sheet.addRows(rows.map((row) => [...row]));
  for (const index of [1, 2, 3]) sheet.getColumn(index).width = 52;
  return sheet;
}

const droppedGroupsOf = (
  customization: TemplateCustomization,
): ReadonlySet<ColumnGroup> =>
  new Set(
    Object.entries(TEMPLATE_SECTIONS).flatMap(([section, group]) =>
      customization[section as TemplateSectionKey] === false ? [group] : [],
    ),
  );

const keptColumnsOf = (
  columns: readonly Column[],
  customization: StoredCustomization,
  droppedGroups: ReadonlySet<ColumnGroup>,
) => {
  const dropped = droppedColumnsOf(columns, customization);
  return columns.filter(
    (column) => !dropped.includes(column) && !droppedGroups.has(column.group),
  );
};

async function build(
  rows: number,
  internalIds: readonly number[],
  customization: TemplateCustomization,
  manualGroups: readonly ManualGroup[],
): Promise<ExcelBuffer> {
  const book = new ExcelJS.Workbook();
  const stored = storedCustomizationOf(customization);
  const isCustomized = hasCustomization(stored);
  const readMe = addReadMeSheet(
    book,
    "IGSN sample import template",
    isCustomized ? [...READ_ME_LINES, CUSTOMIZED_READ_ME_LINE] : READ_ME_LINES,
  );
  if (isCustomized) writeCustomization(readMe, stored);
  const vocabulary = vocabularyLayout([
    ...VOCABULARY_BLOCKS,
    manualGroupBlock(manualGroups),
  ]);
  const isParentColumnDropped =
    isCustomized && customization.subSamples !== true;
  const droppedGroups = droppedGroupsOf(customization);
  const sampleColumns = keptColumnsOf(
    SAMPLE_COLUMNS,
    stored,
    droppedGroups,
  ).filter(({ path }) => !isParentColumnDropped || path !== "parentIds");
  const samples = addDataSheet(
    book,
    SHEETS.samples,
    sampleColumns,
    rows,
    prefillOf(stored),
    vocabulary.placements,
  );
  const defaults = sampleColumns.flatMap((column, index) => {
    const label = defaultLabelOf(column);
    return label === undefined ? [] : [{ number: index + 1, label }];
  });
  for (let row = FIRST_DATA_ROW; row <= lastDataRow(rows); row++) {
    const index = row - FIRST_DATA_ROW;
    const internalId = internalIds[index];
    samples.getCell(row, 1).value =
      internalId === undefined ? index + 1 : formatInternalId(internalId);
    for (const { number, label } of defaults)
      samples.getCell(row, number).value = label;
  }
  for (const child of CHILD_SHEETS) {
    if (isParentColumnDropped && child.name === SHEETS.processSteps) continue;
    const columns = keptColumnsOf(child.columns, stored, droppedGroups);
    if (columns.every((column) => column.path === undefined)) continue;
    addChildSheet(book, child.name, columns, rows);
  }
  await addVocabularySheet(book, vocabulary.rows).protect("", {});
  return book.xlsx.writeBuffer();
}

export function importTemplateWorkbook(
  rows: number = MAX_IMPORT_ROWS,
  internalIds: readonly number[] = [],
  customization: TemplateCustomization = {},
  manualGroups: readonly ManualGroup[] = [],
): Promise<ExcelBuffer> {
  return queueBuild(() =>
    build(rows, internalIds, customization, manualGroups),
  );
}

export function xlsxResponse(book: ExcelBuffer, filename: string): Response {
  return new Response(book, {
    headers: {
      "Content-Type": XLSX_MEDIA_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function importTemplateResponse(
  rows: number,
  internalIds: readonly number[] | undefined,
  customization: TemplateCustomization,
  manualGroups: readonly ManualGroup[],
): Promise<Response> {
  return xlsxResponse(
    await importTemplateWorkbook(
      rows,
      internalIds,
      customization,
      manualGroups,
    ),
    IMPORT_TEMPLATE_FILENAME,
  );
}
