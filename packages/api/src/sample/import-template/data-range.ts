import type ExcelJS from "exceljs";

import { HEADER_ROW } from "@projet-igsn/domain/sample/import/template-header";

export const FIRST_DATA_ROW = HEADER_ROW + 1;

export const FIRST_SAMPLE_ROW = FIRST_DATA_ROW + 1;

export const EXAMPLE_KEY = "example";

export const lastDataRow = (rows: number) => FIRST_DATA_ROW + rows - 1;

export const dataRange = (letter: string, rows: number) =>
  `${letter}${FIRST_DATA_ROW}:${letter}${lastDataRow(rows)}`;

export const columnLetter = (sheet: ExcelJS.Worksheet, index: number) =>
  sheet.getColumn(index + 1).letter;
