import type { Sample } from "@projet-igsn/domain/sample/sample";

import { FIELD_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { REQUIRED_MARKER } from "@projet-igsn/domain/sample/import/template-header";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";

import { SHEETS } from "../import-template/columns.ts";
import { exportWorkbook } from "./export-workbook.ts";

const HEADER_ROW = 2;

const FIRST_DATA_ROW = 3;

const ROOT_ONLY: Sample = {
  ...FIELD_SAMPLE,
  id: "66666666-6666-4666-8666-666666666666",
  igsn: "ZYXWVTSRQPNMKJHGFEDCBA9876",
  name: "Root only",
  material: "rock_and_sediment",
  parents: [],
};

let book: ExcelJS.Workbook;

const sheetOf = (name: string) => {
  const found = book.getWorksheet(name);
  if (!found) throw new Error(`missing sheet ${name}`);
  return found;
};

const headersOf = (name: string) =>
  (sheetOf(name).getRow(HEADER_ROW).values as ExcelJS.CellValue[])
    .slice(1)
    .map((header) => (header as string).replace(REQUIRED_MARKER, ""));

const rowOf = (name: string, row: number) => {
  const cells = sheetOf(name).getRow(row);
  return Object.fromEntries(
    headersOf(name).map((header, index) => [
      header,
      cells.getCell(index + 1).value,
    ]),
  );
};

const greyedHeadersOf = (name: string, row: number) => {
  const cells = sheetOf(name).getRow(row);
  return headersOf(name).filter((_, index) => {
    const fill = cells.getCell(index + 1).fill;
    return (
      fill?.type === "pattern" &&
      fill.pattern === "solid" &&
      fill.fgColor?.argb === "FFD9D9D9"
    );
  });
};

const materialLevels = () =>
  headersOf(SHEETS.samples).filter((header) => header.startsWith("Material"));

beforeAll(async () => {
  book = new ExcelJS.Workbook();
  await book.xlsx.load(await exportWorkbook([FIELD_SAMPLE, ROOT_ONLY]));
}, 30_000);

describe("samples export workbook", () => {
  it("should key the Samples sheet by Sample # with the IGSN and parent IGSN after the name and no metadata column", () => {
    const headers = headersOf(SHEETS.samples);

    expect({
      leading: headers.slice(0, 4),
      metadata: headers.filter((header) =>
        /^(Status|Owner|Collaborator|Created|Updated|Published|Synthe)/.test(
          header,
        ),
      ),
    }).toEqual({
      leading: ["Sample #", "Name", "IGSN", "Parent IGSN"],
      metadata: [],
    });
  });

  it("should write a sample's codes as the labels the dropdowns offer and leave an unset value empty", () => {
    expect(rowOf(SHEETS.samples, FIRST_DATA_ROW)).toMatchObject({
      "Sample #": "sample-7",
      IGSN: FIELD_SAMPLE.igsn,
      Name: FIELD_SAMPLE.name,
      "Parent IGSN": FIELD_SAMPLE.parents[0]?.igsn,
      Nature: "Hand sample",
      "Material (level 1)": "Rock and sediment",
      "Material (level 2)": "Rock",
      "Material (level 3)": "Igneous",
      "Oriented sample": "Yes",
      "Asbestos-rich": "No",
      "Position type": "Point",
      Longitude: 6.18,
      "Region (level 1)": "Country",
      "Region (level 2)": "France",
      "Collection date precision": "Hour and minute",
      "Collection date start": "2024-06-01T08:30",
      "Metamorphic facies": null,
    });
  });

  it("should protect no sheet and grey only the identifiers, the fields frozen by publication and the frozen material levels of each row", () => {
    const always = [
      "Sample #",
      "IGSN",
      "Parent IGSN",
      "Provenance status",
      "Manual group",
    ];
    const collector = ["Collector first name", "Collector last name"];

    expect({
      protectedSheets: book.worksheets
        .filter(
          (sheet) =>
            (sheet as unknown as { sheetProtection?: { sheet?: boolean } })
              .sheetProtection?.sheet === true,
        )
        .map((sheet) => sheet.name),
      fieldSample: greyedHeadersOf(SHEETS.samples, FIRST_DATA_ROW).sort(),
      rootOnly: greyedHeadersOf(SHEETS.samples, FIRST_DATA_ROW + 1).sort(),
    }).toEqual({
      protectedSheets: [],
      fieldSample: [
        ...always,
        ...collector,
        "Material (level 1)",
        "Material (level 2)",
      ].sort(),
      rootOnly: [...always, ...collector, ...materialLevels()].sort(),
    });
  });

  it("should write one child row per value keyed by the sample's internal ID, the sample's own readings on its first row", () => {
    const storage = SHEETS.storageConditions;
    const [first, second] = [FIRST_DATA_ROW, FIRST_DATA_ROW + 1].map((row) =>
      rowOf(storage, row),
    );

    expect({
      first: {
        key: first?.["Sample #"],
        value: first?.["Storage condition"],
        reading: first?.["Temperature value"],
      },
      second: {
        key: second?.["Sample #"],
        value: second?.["Storage condition"],
        reading: second?.["Temperature value"],
      },
      greyed: greyedHeadersOf(storage, FIRST_DATA_ROW),
    }).toEqual({
      first: {
        key: "sample-7",
        value: "Temperature controlled",
        reading: 4,
      },
      second: {
        key: "sample-7",
        value: "Pressure controlled",
        reading: null,
      },
      greyed: ["Sample #", "Sample name (filled automatically)"],
    });
  });
});
