import type { Sample } from "@projet-igsn/domain/sample/sample";

import { RESEARCH_PROJECT_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { REQUIRED_MARKER } from "@projet-igsn/domain/sample/import/template-header";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";

import { SHEETS } from "../import-template/columns.ts";
import { exportWorkbook } from "./export-workbook.ts";

const HEADER_ROW = 2;

const FIRST_DATA_ROW = 3;

const ROOT_ONLY: Sample = {
  ...RESEARCH_PROJECT_SAMPLE,
  id: "66666666-6666-4666-8666-666666666666",
  igsn: "ZYXWVTSRQPNMKJHGFEDCBA9876",
  name: "Root only",
  material: "rock_and_sediment",
  parents: [],
};

const SUB_SAMPLE: Sample = {
  ...RESEARCH_PROJECT_SAMPLE,
  processSteps: [
    {
      kind: "subsampling",
      date: { precision: "day", start: "2024-06-05", end: "2024-06-06" },
      description: "Sawn into three slabs",
    },
    {
      kind: "transformation",
      date: {
        precision: "hour",
        start: "2025-01-15T09:00",
        end: "2025-01-15T11:00",
        timeZone: "Europe/Paris",
      },
      description: null,
    },
  ],
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
  await book.xlsx.load(await exportWorkbook([SUB_SAMPLE, ROOT_ONLY]));
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
      IGSN: RESEARCH_PROJECT_SAMPLE.igsn,
      Name: RESEARCH_PROJECT_SAMPLE.name,
      "Parent IGSN": RESEARCH_PROJECT_SAMPLE.parents[0]?.igsn,
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
      "Research program kind": "Research program",
    });
  });

  it("should protect no sheet and grey only the identifiers, a stored parent, the fields frozen by publication and the frozen material levels of each row", () => {
    const always = ["Sample #", "IGSN", "Provenance status", "Manual group"];
    const collector = ["Collector first name", "Collector last name"];

    expect({
      protectedSheets: book.worksheets
        .filter(
          (sheet) =>
            (sheet as unknown as { sheetProtection?: { sheet?: boolean } })
              .sheetProtection?.sheet === true,
        )
        .map((sheet) => sheet.name),
      researchProjectSample: greyedHeadersOf(
        SHEETS.samples,
        FIRST_DATA_ROW,
      ).sort(),
      rootOnly: greyedHeadersOf(SHEETS.samples, FIRST_DATA_ROW + 1).sort(),
    }).toEqual({
      protectedSheets: [],
      researchProjectSample: [
        ...always,
        "Parent IGSN",
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

  it("should list each stored process step of a sub-sample on its own Process steps row", () => {
    const stepsOf = (row: number) => {
      const { "Sample name (filled automatically)": _lookup, ...cells } = rowOf(
        SHEETS.processSteps,
        row,
      );
      return cells;
    };

    expect(
      [FIRST_DATA_ROW, FIRST_DATA_ROW + 1, FIRST_DATA_ROW + 2].map(stepsOf),
    ).toEqual([
      {
        "Sample #": "sample-7",
        Kind: "Sub-sampling",
        "Date precision": "Day",
        "Date start": "2024-06-05",
        "Date end": "2024-06-06",
        "Date time zone": null,
        Description: "Sawn into three slabs",
      },
      {
        "Sample #": "sample-7",
        Kind: "Transformation",
        "Date precision": "Hour and minute",
        "Date start": "2025-01-15T09:00",
        "Date end": "2025-01-15T11:00",
        "Date time zone": "Europe/Paris",
        Description: null,
      },
      {
        "Sample #": null,
        Kind: null,
        "Date precision": null,
        "Date start": null,
        "Date end": null,
        "Date time zone": null,
        Description: null,
      },
    ]);
  });

  it("should add the Process steps sheet only when an exported sample has a parent", async () => {
    const parentless = new ExcelJS.Workbook();
    await parentless.xlsx.load(await exportWorkbook([ROOT_ONLY]));
    const hasProcessSteps = (source: ExcelJS.Workbook) =>
      source.worksheets.some(({ name }) => name === SHEETS.processSteps);

    expect({
      withSubSample: hasProcessSteps(book),
      parentlessOnly: hasProcessSteps(parentless),
    }).toEqual({ withSubSample: true, parentlessOnly: false });
  });
});
