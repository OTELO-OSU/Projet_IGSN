import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import {
  HEADER_ROW,
  REQUIRED_MARKER,
} from "@projet-igsn/domain/sample/import/template-header";
import ExcelJS from "exceljs";

import { SHEETS } from "./columns.ts";
import { prefilledHeaderLabelsOf, readCustomization } from "./customization.ts";
import { readRows } from "./read-rows.ts";
import { templateLayout } from "./template-layout.ts";
import { withoutPrefilledRows } from "./validate-import.ts";
import { importTemplateWorkbook } from "./workbook.ts";

type Cells = Record<string, ExcelJS.CellValue>;

let template: ReturnType<typeof importTemplateWorkbook> | undefined;

export async function templateBook(): Promise<ExcelJS.Workbook> {
  template ??= importTemplateWorkbook(3);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await template);
  return book;
}

export const filledRowsOf = (book: ExcelJS.Workbook) =>
  withoutPrefilledRows(
    readRows(book, templateLayout(book).layout),
    prefilledHeaderLabelsOf(readCustomization(book)),
  );

export function sheetOf(
  book: ExcelJS.Workbook,
  name: string,
): ExcelJS.Worksheet {
  const sheet = book.getWorksheet(name);
  if (!sheet) throw new Error(`missing sheet ${name}`);
  return sheet;
}

export function columnOf(sheet: ExcelJS.Worksheet, header: string): number {
  let found: number | undefined;
  sheet.getRow(HEADER_ROW).eachCell((cell, number) => {
    if (cell.text.replace(REQUIRED_MARKER, "") === header) found = number;
  });
  if (found === undefined) throw new Error(`missing column ${header}`);
  return found;
}

export function fill(
  book: ExcelJS.Workbook,
  name: string,
  row: number,
  cells: Cells,
): void {
  const sheet = sheetOf(book, name);
  for (const [header, value] of Object.entries(cells)) {
    sheet.getCell(row, columnOf(sheet, header)).value = value;
  }
}

export function deleteColumn(
  book: ExcelJS.Workbook,
  name: string,
  header: string,
): void {
  const sheet = sheetOf(book, name);
  sheet.spliceColumns(columnOf(sheet, header), 1);
}

export function swapColumns(
  book: ExcelJS.Workbook,
  name: string,
  left: string,
  right: string,
): void {
  const sheet = sheetOf(book, name);
  const [from, to] = [columnOf(sheet, left), columnOf(sheet, right)];
  for (let row = 2; row <= sheet.rowCount; row++) {
    const [a, b] = [sheet.getCell(row, from), sheet.getCell(row, to)];
    [a.value, b.value] = [b.value, a.value];
  }
}

export const CLEAN_SAMPLE: Cells = {
  Name: "Basalt 1",
  "Local ID": 123,
  "Sample type (level 1)": "Individual sample",
  Nature: "Hand sample",
  "Material (level 1)": "Rock and sediment",
  "Material (level 2)": "Rock",
  "Material (level 3)": "Igneous",
  "Provenance status": "Research project sample",
  "Collector first name": "Marie",
  "Collector last name": "Curie",
  "Collection date precision": "Day",
  "Collection date start": new Date(Date.UTC(2024, 0, 15)),
  "Collection date end": "2024-01-20",
  "Position type": "Point",
  Longitude: 2.35,
  Latitude: "45.2",
  "Region (level 1)": "Country",
  "Region (level 2)": "France",
  "Oriented sample": "Yes",
  "Orientation explanation": "North arrow",
  "Geological age (min) time scale": "Neogene Pliocene (ICS3)",
  "Geological age (max) time scale": "Neogene Miocene (ICS4)",
  "Existence status": "Exists",
  "Availability status": "Available",
};

export const CLEAN_INPUT = {
  name: "Basalt 1",
  localId: "123",
  type: "individual_sample",
  nature: "hand_sample",
  material: "rock_and_sediment.rock.igneous",
  scientificContext: {
    provenanceStatus: "research_project_sample",
    collectorFirstname: "Marie",
    collectorLastname: "Curie",
  },
  description: {
    collectionDate: {
      precision: "day",
      start: "2024-01-15",
      end: "2024-01-20",
    },
    oriented: true,
    orientationExplanation: "North arrow",
  },
  location: {
    position: { type: "point", longitude: 2.35, latitude: 45.2 },
    region: { kind: "country", country: "FR" },
  },
  age: { geologicalAgeMin: 3, geologicalAgeMax: 4 },
  existenceStatus: "exists",
  availabilityStatus: "available",
  relations: [
    {
      identifierType: "doi",
      identifier: "https://doi.org/10.1234/abc",
      relationType: "is_cited_by",
      targetResourceType: "book",
    },
  ],
  condition: {
    storageConditions: ["temperature_controlled", "light_controlled"],
    temperature: { type: "frozen" },
    light: "total_darkness",
  },
};

export const CLEAN_DUPLICATE = {
  name: "Basalt 1",
  nature: "hand_sample",
  type: null,
  collectionMethod: null,
  material: "rock_and_sediment.rock.igneous",
  scientificContext: {
    provenanceStatus: "research_project_sample",
    additionalRoles: [],
    collectorFirstname: "Marie",
    collectorLastname: "Curie",
  },
} satisfies CreateSample;

export const CLEAN_ROWS_BY_PATH = {
  "relations.0": { sheet: SHEETS.relations, row: 3 },
  "condition.storageConditions.0": { sheet: SHEETS.storageConditions, row: 3 },
  "condition.temperature.type": { sheet: SHEETS.storageConditions, row: 3 },
  "condition.storageConditions.1": { sheet: SHEETS.storageConditions, row: 4 },
  "condition.light": { sheet: SHEETS.storageConditions, row: 4 },
};

export async function cleanBook(): Promise<ExcelJS.Workbook> {
  const book = await templateBook();
  fill(book, SHEETS.samples, 3, CLEAN_SAMPLE);
  fill(book, SHEETS.relations, 3, {
    "Sample #": 1,
    "Identifier type": "DOI",
    Identifier: "https://doi.org/10.1234/abc",
    "Relation type": "Is cited by",
    "Resource type": "Book",
  });
  fill(book, SHEETS.storageConditions, 3, {
    "Sample #": 1,
    "Storage condition": "Temperature controlled",
    Temperature: "Frozen",
  });
  fill(book, SHEETS.storageConditions, 4, {
    "Sample #": 1,
    "Storage condition": "Light controlled",
    Light: "Total darkness",
  });
  return book;
}

const INHERITED_CELLS = [
  "Collection date precision",
  "Collection date start",
  "Collection date end",
  "Position type",
  "Longitude",
  "Latitude",
  "Region (level 1)",
  "Region (level 2)",
];

export async function parentedBook(
  parentIgsn: string,
  cells: Cells = {},
): Promise<ExcelJS.Workbook> {
  const book = await cleanBook();
  fill(book, SHEETS.samples, 3, {
    ...Object.fromEntries(INHERITED_CELLS.map((header) => [header, null])),
    "Parent IGSN": parentIgsn,
    ...cells,
  });
  return book;
}
