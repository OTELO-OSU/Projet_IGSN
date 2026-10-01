import { FIELD_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { SHEETS } from "./columns.ts";
import {
  CLEAN_SAMPLE,
  cleanBook,
  deleteColumn,
  fill,
  parentedBook,
  templateBook,
} from "./import-fixture.ts";
import { validateImport } from "./validate-import.ts";
import { importTemplateWorkbook } from "./workbook.ts";

const FUTURE = "date must not be in the future";

const ORDER = "date range start must not be after end";

const UNAVAILABLE = 404;

const GROUP = { id: "0190c9a0-0000-7000-8000-000000000001", name: "Alps" };

const PUBLISHED_PARENTS = new Map([[FIELD_SAMPLE.igsn!, FIELD_SAMPLE]]);

const validate = (bytes: ArrayBuffer) =>
  validateImport(
    bytes,
    (numbers) =>
      Promise.resolve(new Set(numbers.filter((n) => n === UNAVAILABLE))),
    () => Promise.resolve([GROUP]),
    (igsns) =>
      Promise.resolve(
        new Map(
          igsns.flatMap((igsn) => {
            const parent = PUBLISHED_PARENTS.get(igsn);
            return parent === undefined ? [] : [[igsn, parent] as const];
          }),
        ),
      ),
  );

const bytesOf = async (book: ExcelJS.Workbook) =>
  new Uint8Array(await book.xlsx.writeBuffer()).buffer;

const issuesOf = async (bytes: ArrayBuffer) => (await validate(bytes)).issues;

const PREFILLED_HEADERS = [
  "Provenance status",
  "Manual group",
  "Material (level 1)",
  "Material (level 2)",
  "Material (level 3)",
];

const customizedBook = async () => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    await importTemplateWorkbook(
      3,
      [],
      {
        provenanceStatus: "field_sample",
        materialPath: "rock_and_sediment.rock.igneous",
        manualGroup: GROUP,
      },
      [GROUP],
    ),
  );
  return book;
};

const subSampleBook = (cells: Record<string, ExcelJS.CellValue> = {}) =>
  parentedBook(FIELD_SAMPLE.igsn!, cells);

const withKey = (book: ExcelJS.Workbook, row: number, key: string) =>
  fill(book, SHEETS.samples, row, { ...CLEAN_SAMPLE, "Sample #": key });

describe("validateImport", () => {
  it("should answer the parsed samples of a publishable file", async () => {
    const book = await cleanBook();
    withKey(book, 4, "sample-8");
    const { issues, samples } = await validate(await bytesOf(book));

    expect({
      issues,
      samples: samples.map(({ input, internalNumber }) => ({
        name: input.name,
        internalNumber,
      })),
    }).toEqual({
      issues: [],
      samples: [
        { name: CLEAN_SAMPLE.Name, internalNumber: null },
        { name: CLEAN_SAMPLE.Name, internalNumber: 8 },
      ],
    });
  });

  it("should answer unreadable_file for bytes that are no workbook", async () => {
    expect(await issuesOf(new TextEncoder().encode("a,b\n1,2").buffer)).toEqual(
      [{ code: "unreadable_file" }],
    );
  });

  it("should stop at a structural issue before reading any row", async () => {
    const book = await templateBook();
    deleteColumn(book, SHEETS.samples, "Nature");

    expect(await issuesOf(await bytesOf(book))).toEqual([
      { sheet: SHEETS.samples, column: "Nature", code: "missing_column" },
    ]);
  });

  it.each([
    ["no row is filled", 0, "no_sample"],
    ["past the import row cap", MAX_IMPORT_ROWS + 1, "too_many_rows"],
  ])("should stop at the row count when %s", async (_, count, code) => {
    const book = await templateBook();
    for (let row = 3; row < 3 + count; row++) {
      fill(book, SHEETS.samples, row, { Name: `Sample ${row}` });
    }

    expect(await issuesOf(await bytesOf(book))).toEqual([
      { sheet: SHEETS.samples, code },
    ]);
  });

  it("should report every sample's errors, one sample's errors gating none", async () => {
    const book = await cleanBook();
    const dated = (
      key: number,
      start: ExcelJS.CellValue,
      end: ExcelJS.CellValue,
    ) => ({
      ...CLEAN_SAMPLE,
      "Sample #": key,
      "Collection date start": start,
      "Collection date end": end,
    });
    fill(book, SHEETS.samples, 3, { "Material (level 4)": "Basalte" });
    fill(book, SHEETS.samples, 4, {
      ...dated(2, null, null),
      "Collection date precision": null,
    });
    fill(book, SHEETS.samples, 5, dated(3, "2999-01-01", "2999-01-02"));
    fill(book, SHEETS.samples, 6, dated(4, "2024-01-20", "2024-01-15"));
    fill(book, SHEETS.samples, 7, dated(5, "demain", "demain"));
    fill(book, SHEETS.samples, 8, dated(6, "02/29/2030", "02/29/2030"));

    const at = (row: number, column: string, value: string) => ({
      sheet: SHEETS.samples,
      row,
      column,
      value,
    });
    const future = { code: "collection_date_future", message: FUTURE };
    const format = { code: "invalid_format", message: expect.any(String) };
    expect(await issuesOf(await bytesOf(book))).toEqual([
      {
        ...at(3, "Material (level 1)", "Rock and sediment"),
        code: "custom",
        message: expect.any(String),
      },
      {
        ...at(3, "Material (level 1)", "Rock and sediment"),
        code: "material_incomplete",
      },
      {
        sheet: SHEETS.samples,
        row: 4,
        column: "Collection date precision",
        code: "collection_date_missing",
      },
      { ...at(5, "Collection date start", "2999-01-01"), ...future },
      { ...at(5, "Collection date end", "2999-01-02"), ...future },
      {
        ...at(6, "Collection date start", "2024-01-20"),
        code: "collection_date_order",
        message: ORDER,
      },
      { ...at(7, "Collection date start", "demain"), ...format },
      { ...at(7, "Collection date end", "demain"), ...format },
      { ...at(8, "Collection date start", "02/29/2030"), ...format },
      { ...at(8, "Collection date end", "02/29/2030"), ...format },
    ]);
  });

  it("should report a label it cannot resolve without the blocker its absence raises", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, 3, { Nature: "Handy sample" });

    expect(await issuesOf(await bytesOf(book))).toEqual([
      {
        sheet: SHEETS.samples,
        row: 3,
        column: "Nature",
        value: "Handy sample",
        code: "invalid_value",
        message: expect.any(String),
      },
    ]);
  });

  it("should report a dangling child Sample # together with the samples' errors", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.relations, 4, { "Sample #": 7, Title: "Paper" });
    fill(book, SHEETS.samples, 3, { Latitude: 95 });

    expect(await issuesOf(await bytesOf(book))).toEqual([
      {
        sheet: SHEETS.samples,
        row: 3,
        column: "Latitude",
        value: "95",
        code: "too_big",
        message: expect.any(String),
      },
      {
        sheet: SHEETS.relations,
        row: 4,
        column: "Sample #",
        value: "7",
        code: "unknown_sample_key",
      },
    ]);
  });

  it("should list issues by sheet, row, then template column", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, 3, { Latitude: 95 });
    fill(book, SHEETS.samples, 4, {
      ...CLEAN_SAMPLE,
      "Sample #": 2,
      Name: null,
      Longitude: "east",
    });

    expect(await issuesOf(await bytesOf(book))).toEqual([
      {
        sheet: SHEETS.samples,
        row: 3,
        column: "Latitude",
        value: "95",
        code: "too_big",
        message: expect.any(String),
      },
      {
        sheet: SHEETS.samples,
        row: 4,
        column: "Name",
        code: "invalid_type",
        message: expect.any(String),
      },
      {
        sheet: SHEETS.samples,
        row: 4,
        column: "Longitude",
        value: "east",
        code: "invalid_type",
        message: expect.any(String),
      },
    ]);
  });

  it.each([
    ["Nature", "Handy sample", "invalid_value"],
    ["Longitude", "east", "invalid_type"],
  ])(
    "should carry the text typed in %s as the issue value",
    async (column, value, code) => {
      const book = await cleanBook();
      fill(book, SHEETS.samples, 3, { [column]: ` ${value} ` });

      expect(await issuesOf(await bytesOf(book))).toEqual([
        {
          sheet: SHEETS.samples,
          row: 3,
          column,
          value,
          code,
          message: expect.any(String),
        },
      ]);
    },
  );

  it.each([
    [
      "Day",
      new Date(Date.UTC(2024, 0, 20)),
      new Date(Date.UTC(2024, 0, 15)),
      "2024-01-20",
      null,
    ],
    [
      "Hour and minute",
      new Date(Date.UTC(2024, 4, 12, 9, 30)),
      new Date(Date.UTC(2024, 4, 12, 8)),
      "2024-05-12 09:30",
      "Europe/Paris",
    ],
  ])(
    "should carry a date cell at %s precision as its displayed text",
    async (precision, start, end, value, timeZone) => {
      const book = await cleanBook();
      fill(book, SHEETS.samples, 3, {
        "Collection date precision": precision,
        "Collection date start": start,
        "Collection date end": end,
        "Collection date time zone": timeZone,
      });

      expect(await issuesOf(await bytesOf(book))).toEqual([
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Collection date start",
          value,
          code: "collection_date_order",
          message: ORDER,
        },
      ]);
    },
  );

  it("should carry no value for an issue about an empty cell", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, 3, { "Existence status": null });

    expect(await issuesOf(await bytesOf(book))).toEqual([
      {
        sheet: SHEETS.samples,
        row: 3,
        column: "Existence status",
        code: "existence_status_missing",
      },
    ]);
  });

  it("should default the existence and availability status of a template without their columns", async () => {
    const book = await cleanBook();
    deleteColumn(book, SHEETS.samples, "Existence status");
    deleteColumn(book, SHEETS.samples, "Availability status");
    const { issues, samples } = await validate(await bytesOf(book));

    expect({
      issues,
      statuses: samples.map(({ input }) => [
        input.existenceStatus,
        input.availabilityStatus,
      ]),
    }).toEqual({ issues: [], statuses: [["exists", "available"]] });
  });

  it.each([`sample-${UNAVAILABLE}`, `Sample-${UNAVAILABLE}`])(
    "should report a Sample # holding an unavailable internal ID, whatever its case (%s)",
    async (key) => {
      const book = await cleanBook();
      withKey(book, 4, key);

      expect(await issuesOf(await bytesOf(book))).toEqual([
        {
          sheet: SHEETS.samples,
          row: 4,
          column: "Sample #",
          value: key,
          code: "unavailable_internal_id",
        },
      ]);
    },
  );

  it("should accept a Sample # holding an available internal ID", async () => {
    const book = await cleanBook();
    withKey(book, 4, "sample-8");

    expect(await issuesOf(await bytesOf(book))).toEqual([]);
  });

  it("should read a customized file's rows left at their pre-fill as blank", async () => {
    const book = await customizedBook();
    fill(
      book,
      SHEETS.samples,
      3,
      Object.fromEntries(
        Object.entries(CLEAN_SAMPLE).filter(
          ([header]) => !PREFILLED_HEADERS.includes(header),
        ),
      ),
    );
    const { issues, samples } = await validate(await bytesOf(book));

    expect({
      issues,
      groups: samples.map(({ input }) => input.manualGroupIds),
    }).toEqual({ issues: [], groups: [[GROUP.id]] });
  });

  it("should answer no_sample for a customized file left untouched", async () => {
    expect(await issuesOf(await bytesOf(await customizedBook()))).toEqual([
      { sheet: SHEETS.samples, code: "no_sample" },
    ]);
  });

  it("should report a child row picking a row left at its pre-fill as dangling", async () => {
    const book = await customizedBook();
    fill(book, SHEETS.samples, 3, { Name: "Basalt 1" });
    fill(book, SHEETS.relations, 3, { "Sample #": 2, Title: "Paper" });

    expect(
      (await issuesOf(await bytesOf(book))).filter(
        (issue) => issue.sheet === SHEETS.relations,
      ),
    ).toEqual([
      {
        sheet: SHEETS.relations,
        row: 3,
        column: "Sample #",
        value: "2",
        code: "unknown_sample_key",
      },
    ]);
  });

  it("should cite a published parent by its IGSN, the sub-sample inheriting its collection date and carrying no location", async () => {
    const { issues, samples } = await validate(
      await bytesOf(await subSampleBook()),
    );

    expect({
      issues,
      parentIds: samples[0]?.input.parentIds,
      location: samples[0]?.input.location,
      collectionDate: samples[0]?.input.description?.collectionDate,
    }).toEqual({
      issues: [],
      parentIds: [FIELD_SAMPLE.id],
      location: undefined,
      collectionDate: {
        precision: "day",
        start: "2024-06-01",
        end: "2024-06-01",
      },
    });
  });

  it.each([
    [
      "an IGSN no published sample carries",
      { "Parent IGSN": "UNKNOWN0123456789" },
      "Parent IGSN",
      "UNKNOWN0123456789",
      "parent_not_found",
    ],
    [
      "two IGSNs in the cell",
      { "Parent IGSN": `${FIELD_SAMPLE.igsn}, ZYXWVTSRQPNMKJHGFEDCBA9876` },
      "Parent IGSN",
      `${FIELD_SAMPLE.igsn}, ZYXWVTSRQPNMKJHGFEDCBA9876`,
      "multiple_parent_igsns",
    ],
    [
      "a location filled beside the parent",
      { Longitude: 2.35 },
      "Longitude",
      "2.35",
      "location_inherited_from_parent",
    ],
    [
      "a collection date filled beside the parent",
      { "Collection date start": "2024-01-15" },
      "Collection date start",
      "2024-01-15",
      "collection_date_inherited_from_parent",
    ],
  ])(
    "should refuse a sub-sample row citing %s",
    async (_, cells, column, value, code) => {
      const book = await subSampleBook(cells);

      expect(await issuesOf(await bytesOf(book))).toEqual([
        { sheet: SHEETS.samples, row: 3, column, value, code },
      ]);
    },
  );

  it("should still validate a template predating the Parent IGSN column", async () => {
    const book = await cleanBook();
    deleteColumn(book, SHEETS.samples, "Parent IGSN");

    expect(await issuesOf(await bytesOf(book))).toEqual([]);
  });
});
