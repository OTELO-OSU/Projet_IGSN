import type { Sample } from "@projet-igsn/domain/sample/sample";

import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import {
  FROZEN_FORM_FIELDS,
  FROZEN_FORM_FIELDS_BY_PROVENANCE,
  frozenMaterialDepth,
} from "@projet-igsn/domain/sample/publication/published-field-lock";
import ExcelJS from "exceljs";

import type { Column } from "../import-template/columns.ts";
import type { Cell } from "./sample-row.ts";

import { queueBuild } from "../import-template/build-queue.ts";
import { SAMPLE_KEY_HEADER, SHEETS } from "../import-template/columns.ts";
import {
  addChildSheet,
  addDataSheet,
  addReadMeSheet,
  addVocabularySheet,
  type ExcelBuffer,
  FIRST_DATA_ROW,
  FROZEN_FILL,
  xlsxResponse,
} from "../import-template/workbook.ts";
import {
  EXPORT_CHILD_SHEETS,
  EXPORT_SAMPLE_COLUMNS,
} from "./export-columns.ts";
import { childRows, sampleRow } from "./sample-row.ts";

type ExportRow = { sample: Sample; cells: readonly Cell[] };

const KEY_COLUMNS = 2;

const FROZEN_PATHS = new Set(["igsn", "parents.igsn", ...FROZEN_FORM_FIELDS]);

const READ_ME_LINES = [
  `One published sample per row on the "${SHEETS.samples}" sheet, from row ${FIRST_DATA_ROW}, identified by its "${SAMPLE_KEY_HEADER}", its internal ID, so do not edit it.`,
  `A row on ${EXPORT_CHILD_SHEETS.map((child) => `"${child.name}"`).join(", ")} belongs to the sample whose "${SAMPLE_KEY_HEADER}" it picks, one value per row, and a value is added on an empty row picking that "${SAMPLE_KEY_HEADER}".`,
  `A greyed cell holds an identifier or a value frozen since publication, so the server will refuse to change it.`,
  `The "${SHEETS.vocabularies}" sheet lists every value the dropdowns offer, with the code the registry stores.`,
];

export function isFrozen(column: Column, sample: Sample): boolean {
  if (column.path === undefined || FROZEN_PATHS.has(column.path)) return true;
  const provenance = sample.scientificContext?.provenanceStatus;
  if (
    provenance !== undefined &&
    FROZEN_FORM_FIELDS_BY_PROVENANCE[provenance].includes(column.path)
  ) {
    return true;
  }
  return (
    column.path === "material" &&
    (column.level ?? 1) <= frozenMaterialDepth(sample.material)
  );
}

function fill(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  rows: readonly ExportRow[],
) {
  for (const [index, { sample, cells }] of rows.entries()) {
    const row = sheet.getRow(FIRST_DATA_ROW + index);
    for (const [column, definition] of columns.entries()) {
      const cell = row.getCell(column + 1);
      const value = cells[column];
      if (value !== null && value !== undefined) cell.value = value;
      if (isFrozen(definition, sample)) cell.fill = FROZEN_FILL;
    }
  }
}

const keyOf = (sample: Sample): Cell =>
  sample.internalNumber === null
    ? null
    : formatInternalId(sample.internalNumber);

async function build(samples: readonly Sample[]): Promise<ExcelBuffer> {
  const book = new ExcelJS.Workbook();
  addReadMeSheet(book, "IGSN samples export", READ_ME_LINES);
  const sampleRows = Math.max(1, samples.length);
  const samplesSheet = addDataSheet(
    book,
    SHEETS.samples,
    EXPORT_SAMPLE_COLUMNS,
    sampleRows,
  );
  fill(
    samplesSheet,
    EXPORT_SAMPLE_COLUMNS,
    samples.map((sample) => ({
      sample,
      cells: sampleRow(sample, EXPORT_SAMPLE_COLUMNS).with(0, keyOf(sample)),
    })),
  );
  for (const child of EXPORT_CHILD_SHEETS) {
    const rows = samples.flatMap((sample) =>
      childRows(sample, child.columns.slice(KEY_COLUMNS)).map((cells) => ({
        sample,
        cells: [keyOf(sample), null, ...cells],
      })),
    );
    const sheet = addChildSheet(
      book,
      child.name,
      child.columns,
      rows.length + MAX_IMPORT_ROWS,
      sampleRows,
    );
    fill(sheet, child.columns, rows);
  }
  addVocabularySheet(book);
  return book.xlsx.writeBuffer();
}

export function exportWorkbook(
  samples: readonly Sample[],
): Promise<ExcelBuffer> {
  return queueBuild(() => build(samples));
}

export async function samplesExportResponse(
  samples: readonly Sample[],
): Promise<Response> {
  const date = new Date().toISOString().slice(0, 10);
  return xlsxResponse(
    await exportWorkbook(samples),
    `igsn-samples-export-${date}.xlsx`,
  );
}
