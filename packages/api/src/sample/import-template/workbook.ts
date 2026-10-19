import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { IMPORT_TEMPLATE_FILENAME } from "@projet-igsn/domain/sample/import/import-validator";
import { lockedTemplateFields } from "@projet-igsn/domain/sample/import/locked-template-fields";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { TEMPLATE_FIELDS } from "@projet-igsn/domain/sample/import/template-fields";
import { HEADER_ROW } from "@projet-igsn/domain/sample/import/template-header";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import ExcelJS from "exceljs";

import type { Column } from "./columns.ts";
import type {
  StoredCustomization,
  TemplateCustomization,
} from "./customization.ts";
import type { ExcelBuffer } from "./xlsx-response.ts";

import { queueBuild } from "./build-queue.ts";
import { addChildSheet } from "./child-sheet.ts";
import {
  CHILD_SHEETS,
  SAMPLE_COLUMNS,
  SAMPLE_KEY_HEADER,
  SHEETS,
} from "./columns.ts";
import {
  defaultLabelOf,
  droppedColumnsOf,
  hasCustomization,
  prefillOf,
  storedCustomizationOf,
  writeCustomization,
} from "./customization.ts";
import { FIRST_DATA_ROW, lastDataRow } from "./data-range.ts";
import { addDataSheet } from "./data-sheet.ts";
import { addReadMeSheet } from "./read-me-sheet.ts";
import { GROUP_ROW } from "./section-style.ts";
import {
  addVocabularySheet,
  manualGroupBlock,
  VOCABULARY_BLOCKS,
  vocabularyLayout,
} from "./vocabulary-sheet.ts";
import { xlsxResponse } from "./xlsx-response.ts";

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

const droppedPathsOf = (
  customization: TemplateCustomization,
): readonly string[] => {
  const locked = lockedTemplateFields({
    provenanceStatus: customization.provenanceStatus,
    hasManualGroup: customization.prefilledManualGroup !== undefined,
  });
  return TEMPLATE_FIELDS.flatMap(({ key, paths }) =>
    customization[key] === false && !locked.includes(key) ? paths : [],
  );
};

const keptColumnsOf = (
  columns: readonly Column[],
  customization: StoredCustomization,
  droppedPaths: readonly string[],
) => {
  const dropped = droppedColumnsOf(columns, customization);
  return columns.filter(
    (column) =>
      !dropped.includes(column) &&
      (column.path === undefined ||
        !droppedPaths.some((path) => isPathAtOrUnder(column.path, path))),
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
  const droppedPaths = droppedPathsOf(customization);
  const sampleColumns = keptColumnsOf(
    SAMPLE_COLUMNS,
    stored,
    droppedPaths,
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
    const columns = keptColumnsOf(child.columns, stored, droppedPaths);
    if (columns.every((column) => column.path === undefined)) continue;
    addChildSheet(book, child.name, columns, rows, sampleColumns);
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
