import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { buildSampleInputs } from "./build-sample-inputs.ts";
import { SHEETS } from "./columns.ts";
import {
  CLEAN_INPUT,
  CLEAN_ROWS_BY_PATH,
  CLEAN_SAMPLE,
  cleanBook,
  fill,
  filledRowsOf,
  FIRST_SAMPLE_ROW,
} from "./import-fixture.ts";

const candidatesOf = (book: ExcelJS.Workbook) =>
  buildSampleInputs(filledRowsOf(book));

const CLEAN = {
  samples: [
    {
      row: FIRST_SAMPLE_ROW,
      input: CLEAN_INPUT,
      rowsByPath: CLEAN_ROWS_BY_PATH,
      attachments: [],
    },
  ],
  issues: [],
};

const issue = (sheet: string, row: number, column: string, code: string) => ({
  sheet,
  row,
  column,
  code,
});

describe("buildSampleInputs", () => {
  it("should turn each sample row into a candidate, its child rows joined", async () => {
    expect(candidatesOf(await cleanBook())).toEqual(CLEAN);
  });

  it("should collect each sample's attachment rows beside its input, a file named by two samples once per sample", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW + 1, CLEAN_SAMPLE);
    fill(book, SHEETS.attachments, 3, {
      "Sample #": 1,
      "File name": "report.pdf",
      Title: "Field report",
      "Resource type": "Book",
      Description: "Scanned notebook",
    });
    fill(book, SHEETS.attachments, 4, {
      "Sample #": 2,
      "File name": "report.pdf",
    });

    expect(
      candidatesOf(book).samples.map(({ input, attachments }) => ({
        inputAttachments: input.attachments,
        attachments,
      })),
    ).toEqual([
      {
        inputAttachments: undefined,
        attachments: [
          {
            row: 3,
            name: "report.pdf",
            title: "Field report",
            targetResourceType: "book",
            description: "Scanned notebook",
          },
        ],
      },
      {
        inputAttachments: undefined,
        attachments: [
          { row: 4, name: "report.pdf", title: null, description: null },
        ],
      },
    ]);
  });

  it("should accept a raw code where a label is expected", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW, {
      Nature: "hand_sample",
      "Material (level 2)": "rock",
      "Position type": "point",
    });

    expect(candidatesOf(book)).toEqual(CLEAN);
  });

  it("should read a date cell down to the minute when the row's precision is the hour", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW, {
      "Collection date precision": "Hour and minute",
      "Collection date start": new Date(Date.UTC(2024, 0, 15, 8, 30)),
      "Collection date end": "2024-01-15T09:00",
      "Collection date time zone": "Europe/Paris",
    });

    expect(candidatesOf(book).samples[0]?.input.description).toEqual({
      ...CLEAN_INPUT.description,
      collectionDate: {
        precision: "hour",
        start: "2024-01-15T08:30",
        end: "2024-01-15T09:00",
        timeZone: "Europe/Paris",
      },
    });
  });

  it("should pass a value it cannot convert to the schema untouched", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW, {
      Nature: "Big rock",
      Latitude: "abc",
    });

    const { position } = CLEAN_INPUT.location;
    expect(candidatesOf(book).samples[0]?.input).toMatchObject({
      nature: "Big rock",
      location: { position: { ...position, latitude: "abc" } },
    });
  });

  it("should keep the typed text of a hierarchy level it cannot resolve in the path", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW, {
      "Material (level 2)": null,
    });

    expect(candidatesOf(book).samples[0]?.input.material).toBe(
      "rock_and_sediment.Igneous",
    );
  });

  it("should give a range left without its maximum its minimum", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW, { "Numeric age minimum": 10 });
    fill(book, SHEETS.verticalPositions, 3, {
      "Sample #": 1,
      "Minimum or start (m)": 12,
    });

    const { input } = candidatesOf(book).samples[0]!;
    expect({
      age: input.age,
      verticalPositions: (input.location as { verticalPositions?: unknown })
        .verticalPositions,
    }).toEqual({
      age: { ...CLEAN_INPUT.age, numericAgeMin: 10, numericAgeMax: 10 },
      verticalPositions: [{ start: 12, end: 12 }],
    });
  });

  it.each<[string, (book: ExcelJS.Workbook) => void, object[]]>([
    [
      "a child row pointing at no sample row",
      (book) => fill(book, SHEETS.relations, 3, { "Sample #": 7 }),
      [issue(SHEETS.relations, 3, "Sample #", "unknown_sample_key")],
    ],
    [
      "a filled sample row repeating a Sample #",
      (book) =>
        fill(book, SHEETS.samples, FIRST_SAMPLE_ROW + 1, {
          "Sample #": 1,
          "Sample name": "Basalt 2",
        }),
      [
        issue(
          SHEETS.samples,
          FIRST_SAMPLE_ROW + 1,
          "Sample #",
          "duplicate_sample_key",
        ),
      ],
    ],
    [
      "a filled sample row without a Sample #",
      (book) =>
        fill(book, SHEETS.samples, FIRST_SAMPLE_ROW + 1, {
          "Sample #": null,
          "Sample name": "Basalt 2",
        }),
      [
        issue(
          SHEETS.samples,
          FIRST_SAMPLE_ROW + 1,
          "Sample #",
          "missing_sample_key",
        ),
      ],
    ],
    [
      "a storage-condition reading repeated with another value",
      (book) =>
        fill(book, SHEETS.storageConditions, 5, {
          "Sample #": 1,
          "Storage condition": "Temperature controlled",
          Temperature: "Ambient",
        }),
      [issue(SHEETS.storageConditions, 5, "Temperature", "duplicate_value")],
    ],
  ])("should report %s", async (_, edit, expected) => {
    const book = await cleanBook();
    edit(book);

    expect(candidatesOf(book).issues).toEqual(expected);
  });
});
