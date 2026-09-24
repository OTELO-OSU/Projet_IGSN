import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  CHILD_SHEETS,
  COLUMN_GROUPS,
  DATA_SHEETS,
  DEFAULT_TEMPLATE_ROWS,
  SAMPLE_COLUMNS,
  SHEETS,
  TEMPLATE_VERSION,
} from "./columns.ts";
import { BLOCK_PLACEMENTS } from "./vocabulary-sheet.ts";
import { importTemplateWorkbook, sheetValidations } from "./workbook.ts";

const GROUP_ROW = 1;

const HEADER_ROW = 2;

const FIRST_DATA_ROW = 3;

let book: ExcelJS.Workbook;

const loaded = async (rows?: number) => {
  const source = new ExcelJS.Workbook();
  await source.xlsx.load(await importTemplateWorkbook(rows));
  return source;
};

const sheetOf = (source: ExcelJS.Workbook, name: string) => {
  const found = source.getWorksheet(name);
  if (!found) throw new Error(`missing sheet ${name}`);
  return found;
};

const sheet = (name: string) => sheetOf(book, name);

const valuesOf = (
  values: readonly ExcelJS.CellValue[] | Record<string, ExcelJS.CellValue>,
) => (values as readonly ExcelJS.CellValue[]).slice(1);

const rowTextOf = (name: string, row: number) =>
  valuesOf(sheet(name).getRow(row).values).map((value) =>
    typeof value === "string" ? value : "",
  );

const headerOf = (name: string) => rowTextOf(name, HEADER_ROW);

const groupRunsOf = (name: string) => {
  const groups = rowTextOf(name, GROUP_ROW);
  return groups.filter((group, index) => group !== groups[index - 1]);
};

const sampleKeyRange = (lastRow: number) =>
  `=${SHEETS.samples}!$A$${FIRST_DATA_ROW}:$A$${lastRow}`;

const sampleLookupFormula = (row: number) =>
  `IFERROR(VLOOKUP($A${row}, ${SHEETS.samples}!$A:$B, 2, FALSE), "")`;

const lastRowOf = (formula: string | undefined) =>
  formula?.match(/:\$[A-Z]+\$(\d+)$/)?.[1];

const conditionalFormattings = (worksheet: ExcelJS.Worksheet) =>
  (
    worksheet as unknown as {
      conditionalFormattings: {
        ref: string;
        rules: { formulae?: string[] }[];
      }[];
    }
  ).conditionalFormattings;

const letterOf = (path: string) =>
  sheet(SHEETS.samples).getColumn(
    SAMPLE_COLUMNS.findIndex((column) => column.path === path) + 1,
  ).letter;

const sampleKeyValidation = (
  source: ExcelJS.Workbook,
  name: string,
  row: number,
) => sheetValidations(sheetOf(source, name)).find(`A${row}`);

beforeAll(async () => {
  book = await loaded();
}, 30_000);

describe("import template workbook", () => {
  it("should keep the synthetic material branch out of the template", () => {
    const prunedPaths: string[] = [];
    sheet(SHEETS.vocabularies)
      .getColumn(3)
      .eachCell((cell) => {
        const value = cell.value;
        if (typeof value === "string" && isSyntheticMaterial(value)) {
          prunedPaths.push(value);
        }
      });

    expect({
      prunedPaths,
      syntheticColumns: SAMPLE_COLUMNS.filter((column) =>
        column.path?.startsWith("syntheticDetails"),
      ),
    }).toEqual({ prunedPaths: [], syntheticColumns: [] });
  });

  it.each(DATA_SHEETS)(
    "should run $name's groups once each along row 1, in the declared order",
    ({ name }) => {
      const runs = groupRunsOf(name);

      expect(runs).toEqual(
        COLUMN_GROUPS.filter((group) => runs.includes(group)),
      );
    },
  );

  it("should hold the headers on row 2 and the version in Read me B1", () => {
    expect({
      version: sheet(SHEETS.readMe).getCell("B1").value,
      samples: headerOf(SHEETS.samples),
      children: CHILD_SHEETS.map((child) => headerOf(child.name)),
    }).toEqual({
      version: TEMPLATE_VERSION,
      samples: SAMPLE_COLUMNS.map((column) => column.header),
      children: CHILD_SHEETS.map((child) =>
        child.columns.map((column) => column.header),
      ),
    });
  });

  it("should number the sample rows and size the child sample range and lookups to the requested row count", async () => {
    const rows = 3;
    const small = await loaded(rows);
    const lastRow = rows + HEADER_ROW;
    const relations = sheetOf(small, SHEETS.relations);

    expect({
      sampleNumbers: valuesOf(
        sheetOf(small, SHEETS.samples).getColumn(1).values,
      ).slice(HEADER_ROW),
      relations: lastRowOf(
        sampleKeyValidation(small, SHEETS.relations, FIRST_DATA_ROW)
          ?.formulae?.[0],
      ),
      additionalRoles: lastRowOf(
        sampleKeyValidation(small, SHEETS.additionalRoles, FIRST_DATA_ROW)
          ?.formulae?.[0],
      ),
      validatedAtLastRow:
        sampleKeyValidation(small, SHEETS.relations, lastRow) !== undefined,
      validatedPastLastRow:
        sampleKeyValidation(small, SHEETS.relations, lastRow + 1) !== undefined,
      lookupAtLastRow: relations.getCell(`B${lastRow}`).formula,
      lookupPastLastRow: relations.getCell(`B${lastRow + 1}`).formula,
    }).toEqual({
      sampleNumbers: [1, 2, 3],
      relations: String(lastRow),
      additionalRoles: String(lastRow),
      validatedAtLastRow: true,
      validatedPastLastRow: false,
      lookupAtLastRow: sampleLookupFormula(lastRow),
      lookupPastLastRow: undefined,
    });
  });

  it("should key a child row on a sample number of the Samples sheet and fill the name beside it by lookup", () => {
    const lastRow = DEFAULT_TEMPLATE_ROWS + HEADER_ROW;

    expect(
      CHILD_SHEETS.map((child) => ({
        key: sampleKeyValidation(book, child.name, FIRST_DATA_ROW)
          ?.formulae?.[0],
        lookup: sheet(child.name).getCell(`B${FIRST_DATA_ROW}`).formula,
      })),
    ).toEqual(
      CHILD_SHEETS.map(() => ({
        key: sampleKeyRange(lastRow),
        lookup: sampleLookupFormula(FIRST_DATA_ROW),
      })),
    );
  });

  it.each([
    [
      "description.orientationExplanation",
      "description.oriented",
      'Only when "Oriented sample" is Yes.',
      "Yes",
    ],
    [
      "scientificContext.collectionOrigin",
      "scientificContext.provenanceStatus",
      'Only when "Provenance status" is Collection specimen.',
      "Collection specimen",
    ],
  ])(
    "should state the condition of %s in its prompt and grey it when it does not apply",
    (path, driver, sentence, value) => {
      const samples = sheet(SHEETS.samples);
      const letter = letterOf(path);

      expect({
        prompt: sheetValidations(samples).find(`${letter}${FIRST_DATA_ROW}`)
          ?.prompt,
        formulae: conditionalFormattings(samples).find((formatting) =>
          formatting.ref.startsWith(`${letter}${FIRST_DATA_ROW}:`),
        )?.rules[0]?.formulae,
      }).toEqual({
        prompt: expect.stringContaining(sentence),
        formulae: [`NOT(OR($${letterOf(driver)}${FIRST_DATA_ROW}="${value}"))`],
      });
    },
  );

  it("should grey a storage-condition reading from the storage-condition column of its own tab", () => {
    const storage = sheet(SHEETS.storageConditions);
    const columns =
      CHILD_SHEETS.find((child) => child.name === SHEETS.storageConditions)
        ?.columns ?? [];
    const letterOn = (path: string) =>
      storage.getColumn(columns.findIndex((column) => column.path === path) + 1)
        .letter;
    const letter = letterOn("condition.humidity.percentage");

    expect({
      prompt: sheetValidations(storage).find(`${letter}${FIRST_DATA_ROW}`)
        ?.prompt,
      formulae: conditionalFormattings(storage).find((formatting) =>
        formatting.ref.startsWith(`${letter}${FIRST_DATA_ROW}:`),
      )?.rules[0]?.formulae,
    }).toEqual({
      prompt: expect.stringContaining(
        'Only when "Storage condition" is Moisture controlled.',
      ),
      formulae: [
        `NOT(OR($${letterOn("condition.storageConditions")}${FIRST_DATA_ROW}="Moisture controlled"))`,
      ],
    });
  });

  it("should offer the vocabulary labels of a multi-valued field in the value column of its own tab", () => {
    const storage = sheet(SHEETS.storageConditions);

    expect(
      sheetValidations(storage).find(`C${FIRST_DATA_ROW}`)?.formulae,
    ).toEqual([`=${BLOCK_PLACEMENTS.storage_condition?.labelRange}`]);
  });

  it("should cascade the material level 2 dropdown off the level 2 vocabulary block", () => {
    const samples = sheet(SHEETS.samples);
    const index = SAMPLE_COLUMNS.findIndex(
      (column) => column.block === "material" && column.level === 2,
    );
    const address = `${samples.getColumn(index + 1).letter}${FIRST_DATA_ROW}`;
    const formula =
      sheetValidations(samples).find(address)?.formulae?.[0] ?? "";
    const placement = BLOCK_PLACEMENTS[`material_2`];

    expect(
      formula.match(/Vocabularies!\$[A-Z]+\$\d+(?::\$[A-Z]+\$\d+)?/g),
    ).toEqual([
      placement?.labelAnchor,
      placement?.keyRange,
      placement?.keyRange,
    ]);
  });
});
