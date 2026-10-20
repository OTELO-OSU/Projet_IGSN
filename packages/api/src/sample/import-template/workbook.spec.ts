import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type {
  TemplateFieldKey,
  TemplateSectionKey,
} from "@projet-igsn/domain/sample/import/template-fields";
import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import { lockedTemplateFields } from "@projet-igsn/domain/sample/import/locked-template-fields";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import {
  TEMPLATE_FIELDS,
  TEMPLATE_SECTION_KEYS,
  PARTLY_EXCLUDABLE_TEMPLATE_SECTIONS,
} from "@projet-igsn/domain/sample/import/template-fields";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { isMaterialComplete } from "@projet-igsn/domain/sample/material/is-complete";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";

import type { Column, ColumnGroup } from "./columns.ts";
import type { TemplateCustomization } from "./customization.ts";
import type { TemplateValidation } from "./sheet-validations.ts";

import {
  CHILD_SHEETS,
  COLUMN_GROUPS,
  DATA_SHEETS,
  SAMPLE_COLUMNS,
  SHEETS,
  TEMPLATE_MATERIAL_PATHS,
  TEMPLATE_VERSION,
} from "./columns.ts";
import { CONDITIONAL_FIELDS, conditionOf } from "./conditional-fields.ts";
import { FROZEN_FILL } from "./data-sheet.ts";
import {
  IMPORT_DEFAULTS,
  REQUIRED_SAMPLE_COLUMNS,
} from "./required-columns.ts";
import { sheetValidations } from "./sheet-validations.ts";
import { BLOCK_PLACEMENTS } from "./vocabulary-sheet.ts";
import { importTemplateWorkbook } from "./workbook.ts";

const GROUP_ROW = 1;

const HEADER_ROW = 2;

const FIRST_DATA_ROW = 3;

let book: ExcelJS.Workbook;

const loaded = async (
  rows?: number,
  internalIds?: readonly number[],
  customization?: TemplateCustomization,
  manualGroups?: readonly ManualGroup[],
) => {
  const source = new ExcelJS.Workbook();
  await source.xlsx.load(
    await importTemplateWorkbook(
      rows,
      internalIds,
      customization,
      manualGroups,
    ),
  );
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
  `${SHEETS.samples}!$A$${FIRST_DATA_ROW}:$A$${lastRow}`;

const sampleValueOf = (row: number, letter: string, number: number) =>
  `VLOOKUP($A${row}, ${SHEETS.samples}!$A:$${letter}, ${number}, FALSE)`;

const specificNameColumnOf = (source: ExcelJS.Workbook) => {
  const samples = sheetOf(source, SHEETS.samples);
  const index = valuesOf(samples.getRow(HEADER_ROW).values).indexOf(
    "Specific name",
  );
  return index < 0
    ? undefined
    : { letter: samples.getColumn(index + 1).letter, number: index + 1 };
};

const sampleLookupFormula = (
  row: number,
  specificName: { letter: string; number: number } | undefined,
) => {
  const name = sampleValueOf(row, "B", 2);
  if (specificName === undefined) return `IFERROR(${name}, "")`;
  const specific = sampleValueOf(row, specificName.letter, specificName.number);
  return `IFERROR(${name} & IF(${specific} = "", "", " (" & ${specific} & ")"), "")`;
};

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

const GROUPS = [
  { id: "0190c9a0-0000-7000-8000-000000000001", name: "Alps" },
  { id: "0190c9a0-0000-7000-8000-000000000002", name: "Pyrenees" },
];

const manualGroupDropdownOf = (source: ExcelJS.Workbook) => {
  const samples = sheetOf(source, SHEETS.samples);
  const index = SAMPLE_COLUMNS.findIndex(
    (column) => column.path === "manualGroupIds",
  );
  const address = `${samples.getColumn(index + 1).letter}${FIRST_DATA_ROW}`;
  const range = sheetValidations(samples)
    .find(address)
    ?.formulae?.[0]?.match(/\$B\$(\d+):\$B\$(\d+)$/);
  if (!range) return undefined;
  const vocabularies = sheetOf(source, SHEETS.vocabularies);
  const [first, last] = [Number(range[1]), Number(range[2])];
  return {
    title: vocabularies.getCell(first - 1, 1).value,
    labels: Array.from(
      { length: last - first + 1 },
      (_, offset) => vocabularies.getCell(first + offset, 2).value,
    ),
  };
};

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
      lookupAtLastRow: sampleLookupFormula(
        lastRow,
        specificNameColumnOf(small),
      ),
      lookupPastLastRow: undefined,
    });
  });

  it("should key a child row on a sample number of the Samples sheet and fill the name and specific name beside it by lookup", () => {
    const lastRow = MAX_IMPORT_ROWS + HEADER_ROW;
    const specificName = specificNameColumnOf(book);

    expect(
      CHILD_SHEETS.map((child) => ({
        key: sampleKeyValidation(book, child.name, FIRST_DATA_ROW)
          ?.formulae?.[0],
        lookup: sheet(child.name).getCell(`B${FIRST_DATA_ROW}`).formula,
      })),
    ).toEqual(
      CHILD_SHEETS.map(() => ({
        key: sampleKeyRange(lastRow),
        lookup: sampleLookupFormula(FIRST_DATA_ROW, specificName),
      })),
    );
    expect(specificName).toBeDefined();
  });

  it("should fill the Sample # of each row with its reserved internal ID", async () => {
    const reserved = await loaded(2, [349, 350]);

    expect(
      valuesOf(sheetOf(reserved, SHEETS.samples).getColumn(1).values).slice(
        HEADER_ROW,
      ),
    ).toEqual(["sample-349", "sample-350"]);
  });

  it("should pre-fill every row's existence and availability status with their defaults, editable from their dropdown", () => {
    const samples = sheet(SHEETS.samples);
    const cellsAt = (row: number) =>
      ["existenceStatus", "availabilityStatus"].map((path) => {
        const address = `${letterOf(path)}${row}`;
        const cell = samples.getCell(address);
        return [
          cell.value,
          (cell.fill as ExcelJS.FillPattern | undefined)?.fgColor,
          sheetValidations(samples).find(address)?.type,
        ];
      });

    expect([
      cellsAt(FIRST_DATA_ROW),
      cellsAt(FIRST_DATA_ROW + MAX_IMPORT_ROWS - 1),
    ]).toEqual(
      [0, 1].map(() => [
        ["Exists", undefined, "list"],
        ["Available", undefined, "list"],
      ]),
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

  it.each(["location.position.longitude", "description.collectionDate.start"])(
    "should grey %s once Parent IGSN is filled, since the parent's value is inherited",
    (path) => {
      const samples = sheet(SHEETS.samples);
      const letter = letterOf(path);

      expect({
        prompt: sheetValidations(samples).find(`${letter}${FIRST_DATA_ROW}`)
          ?.prompt,
        formulae: conditionalFormattings(samples)
          .filter((formatting) =>
            formatting.ref.startsWith(`${letter}${FIRST_DATA_ROW}:`),
          )
          .flatMap((formatting) => formatting.rules[0]?.formulae ?? []),
      }).toEqual({
        prompt: expect.stringContaining(
          'Leave empty when "Parent IGSN" is filled.',
        ),
        formulae: expect.arrayContaining([
          `NOT($${letterOf("parentIds")}${FIRST_DATA_ROW}="")`,
        ]),
      });
    },
  );

  it("should offer the vocabulary labels of a multi-valued field in the value column of its own tab", () => {
    const storage = sheet(SHEETS.storageConditions);

    expect(
      sheetValidations(storage).find(`C${FIRST_DATA_ROW}`)?.formulae,
    ).toEqual([`${BLOCK_PLACEMENTS.storage_condition?.labelRange}`]);
  });

  it("should keep every validation within Excel's limits", () => {
    const tooLong = book.worksheets.flatMap((worksheet) =>
      Object.entries(
        (
          worksheet as unknown as {
            dataValidations: { model: Record<string, TemplateValidation> };
          }
        ).dataValidations.model,
      ).flatMap(([address, validation]) =>
        [
          ...(validation.formulae ?? []).map((formula) => [formula, 255]),
          [validation.prompt, 255],
          [validation.error, 255],
          [validation.promptTitle, 32],
          [validation.errorTitle, 32],
        ]
          .filter(([text = "", limit]) => String(text).length > Number(limit))
          .map(([text]) => `${worksheet.name}!${address}: ${text}`),
      ),
    );

    expect(tooLong).toEqual([]);
  });

  it("should offer the requester's manual group names in the Manual group dropdown, from a block appended to the Vocabularies sheet, and no dropdown to a requester without one", async () => {
    expect({
      withGroups: manualGroupDropdownOf(await loaded(1, [], {}, GROUPS)),
      withoutGroups: manualGroupDropdownOf(book),
    }).toEqual({
      withGroups: { title: "Manual group", labels: ["Alps", "Pyrenees"] },
      withoutGroups: undefined,
    });
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

  it("should color each section's group and header cells and border it from the section before", () => {
    const samples = sheet(SHEETS.samples);
    const lastRow = FIRST_DATA_ROW + MAX_IMPORT_ROWS - 1;
    const groups = rowTextOf(SHEETS.samples, GROUP_ROW);
    const firstColumns = groups.flatMap((group, index) =>
      group === groups[index - 1] ? [] : [index + 1],
    );
    const fillOf = (row: number, column: number) =>
      (samples.getCell(row, column).fill as ExcelJS.FillPattern | undefined)
        ?.fgColor?.argb;
    const WHITE = "FFFFFFFF";
    const STYLES: Partial<Record<string, [string, string | undefined]>> = {
      Identity: ["FF45A2E2", WHITE],
      "Sample classification": ["FFDC5472", WHITE],
      Location: ["FF508C00", WHITE],
      "Geological context": ["FF7A6FFF", WHITE],
      Age: ["FFE54B07", WHITE],
      "Physical description": ["FFA0522D", WHITE],
      "Scientific context": ["FFF0A309", undefined],
      "Conservation and security": ["FFF4CECC", undefined],
      "Curation and repository": ["FFFEF2CC", undefined],
    };

    expect(
      firstColumns.map((column) => [
        samples.getCell(GROUP_ROW, column).value,
        fillOf(GROUP_ROW, column),
        fillOf(HEADER_ROW, column),
        samples.getCell(GROUP_ROW, column).font?.color?.argb,
        samples.getCell(FIRST_DATA_ROW, column).border?.left,
        samples.getCell(lastRow, column).border?.left,
      ]),
    ).toEqual(
      COLUMN_GROUPS.filter((group) =>
        groupRunsOf(SHEETS.samples).includes(group),
      ).map((group, index) => {
        const [fill, font] = STYLES[group] ?? [];
        const border = index === 0 ? undefined : { style: "medium" };
        return [group, fill, fill, font, border, border];
      }),
    );
  });
});

describe("customized import template workbook", () => {
  const rows = 3;
  const lastRow = FIRST_DATA_ROW + rows - 1;
  const prefilled = {
    "Provenance status": "Research project sample",
    "Manual group": "Alps",
    "Material (level 1)": "Rock and sediment",
    "Material (level 2)": "Rock",
    "Material (level 3)": "Igneous",
  };
  const customization: TemplateCustomization = {
    provenanceStatus: "research_project_sample",
    materialPath: "rock_and_sediment.rock.igneous",
    prefilledManualGroup: GROUPS[0],
    subSamples: true,
  };
  let customized: ExcelJS.Workbook;

  const samples = () => sheetOf(customized, SHEETS.samples);

  const headersOf = (source: ExcelJS.Workbook) =>
    valuesOf(sheetOf(source, SHEETS.samples).getRow(HEADER_ROW).values);

  const addressOf = (header: string, row: number) => {
    const headers = valuesOf(samples().getRow(HEADER_ROW).values);
    const index = headers.findIndex(
      (value) =>
        typeof value === "string" && value.replace(" *", "") === header,
    );
    if (index < 0) throw new Error(`missing column ${header}`);
    return `${samples().getColumn(index + 1).letter}${row}`;
  };

  beforeAll(async () => {
    customized = await loaded(rows, [], customization, GROUPS);
  }, 30_000);

  it("should keep the Parent IGSN column and the Process steps sheet only when sub-samples are expected", async () => {
    const withoutSubSamples = await loaded(
      rows,
      [],
      { ...customization, subSamples: undefined },
      GROUPS,
    );
    const sheetsOf = (source: ExcelJS.Workbook) =>
      source.worksheets.map((worksheet) => worksheet.name);

    expect({
      expected: {
        parent: headersOf(customized).includes("Parent IGSN"),
        processSteps: sheetsOf(customized).includes(SHEETS.processSteps),
      },
      omitted: {
        headers: headersOf(withoutSubSamples),
        sheets: sheetsOf(withoutSubSamples),
      },
    }).toEqual({
      expected: { parent: true, processSteps: true },
      omitted: {
        headers: headersOf(customized).filter(
          (header) => header !== "Parent IGSN",
        ),
        sheets: sheetsOf(customized).filter(
          (name) => name !== SHEETS.processSteps,
        ),
      },
    });
  });

  it("should fill the name alone beside a child row when the material leaves no specific name", async () => {
    const unknownRock = await loaded(rows, [], {
      materialPath: "rock_and_sediment.rock.unknown",
    });

    expect({
      specificName: specificNameColumnOf(unknownRock),
      lookup: sheetOf(unknownRock, SHEETS.relations).getCell(
        `B${FIRST_DATA_ROW}`,
      ).formula,
    }).toEqual({
      specificName: undefined,
      lookup: sampleLookupFormula(FIRST_DATA_ROW, undefined),
    });
  });

  it("should write each pre-fill label, greyed, in the first and last data rows", () => {
    const cellsAt = (row: number) =>
      Object.keys(prefilled).map((header) => {
        const cell = samples().getCell(addressOf(header, row));
        return [header, cell.value, cell.fill];
      });

    expect([cellsAt(FIRST_DATA_ROW), cellsAt(lastRow)]).toEqual(
      [FIRST_DATA_ROW, lastRow].map(() =>
        Object.entries(prefilled).map(([header, label]) => [
          header,
          label,
          FROZEN_FILL,
        ]),
      ),
    );
  });

  it("should offer no dropdown on a fixed cell but keep one on the next material level", () => {
    const validated = (header: string) =>
      sheetValidations(samples()).find(addressOf(header, FIRST_DATA_ROW)) !==
      undefined;

    expect(
      [
        "Provenance status",
        "Manual group",
        "Material (level 3)",
        "Material (level 4)",
      ].map(validated),
    ).toEqual([false, false, false, true]);
  });

  it("should drop the columns whose condition no row can meet", () => {
    const dropped = new Set([
      "scientificContext.collectionOrigin",
      "scientificContext.collectionContextDescription",
      "metamorphicFacies",
      "metamorphicFabric",
    ]);

    expect(
      valuesOf(samples().getRow(HEADER_ROW).values).filter(
        (value) => typeof value === "string",
      ),
    ).toEqual(
      SAMPLE_COLUMNS.filter(
        (column) => column.path === undefined || !dropped.has(column.path),
      ).map((column) => column.header),
    );
  });

  it("should omit the child sheets a collection specimen leaves without a column", async () => {
    const specimen = await loaded(1, [], {
      provenanceStatus: "collection_specimen",
    });

    expect(specimen.worksheets.map((worksheet) => worksheet.name)).toEqual([
      SHEETS.readMe,
      SHEETS.samples,
      SHEETS.relations,
      SHEETS.attachments,
      SHEETS.rightsHolders,
      SHEETS.elementsOfInterest,
      SHEETS.storageConditions,
      SHEETS.verticalPositions,
      SHEETS.vocabularies,
    ]);
  });

  it.each<[TemplateFieldKey, string[], string[]]>([
    ["texture", ["Texture"], []],
    ["length", ["Length", "Length unit"], []],
    [
      "numericAge",
      [
        "Numeric age minimum",
        "Numeric age maximum",
        "Numeric age units *",
        "Numeric age reference *",
      ],
      [],
    ],
    ["relations", [], [SHEETS.relations]],
    [
      "storageConditions",
      ["Specific sample conditions"],
      [SHEETS.storageConditions],
    ],
  ])(
    "should drop the %s field's columns %j and the sheets it empties %j",
    async (field, droppedHeaders, emptied) => {
      const trimmed = await loaded(1, [], { [field]: false });

      expect({
        headers: headersOf(trimmed),
        sheets: trimmed.worksheets.map((worksheet) => worksheet.name),
      }).toEqual({
        headers: headersOf(book).filter(
          (header) => !droppedHeaders.includes(header as string),
        ),
        sheets: book.worksheets
          .map((worksheet) => worksheet.name)
          .filter((name) => !emptied.includes(name)),
      });
    },
  );

  it("should drop with the position the navigation type and vertical positions requiring it", async () => {
    const trimmed = await loaded(1, [], {
      provenanceStatus: "collection_specimen",
      position: false,
    });

    expect({
      navigationType: headersOf(trimmed).includes("Navigation type"),
      verticalPositions: trimmed.worksheets.some(
        (worksheet) => worksheet.name === SHEETS.verticalPositions,
      ),
    }).toEqual({ navigationType: false, verticalPositions: false });
  });

  it.each<[string, TemplateCustomization, string[]]>([
    [
      "a research project sample, its collection date, position and collector",
      {
        provenanceStatus: "research_project_sample",
        collectionDate: false,
        position: false,
        collector: false,
      },
      [
        "Collection date start",
        "Position type",
        "Collector first name *",
        "Collector last name *",
      ],
    ],
    [
      "a collection specimen, its collection origin",
      { provenanceStatus: "collection_specimen", collectionOrigin: false },
      ["Collection origin *"],
    ],
    [
      "a picked manual group, its column",
      { prefilledManualGroup: GROUPS[0], manualGroup: false },
      ["Manual group"],
    ],
  ])(
    "should keep for %s even when excluded",
    async (_case, customization, kept) => {
      const headers = headersOf(await loaded(1, [], customization));

      expect(kept.filter((header) => !headers.includes(header))).toEqual([]);
    },
  );

  it("should let a collection specimen drop its collection date and position", async () => {
    const headers = headersOf(
      await loaded(1, [], {
        provenanceStatus: "collection_specimen",
        collectionDate: false,
        position: false,
      }),
    );

    expect(
      ["Collection date start", "Position type"].filter((header) =>
        headers.includes(header),
      ),
    ).toEqual([]);
  });

  it("should record the customization codes and the manual group label in Read me C1 alone", () => {
    const readMe = sheetOf(customized, SHEETS.readMe);

    expect({
      stored: JSON.parse(readMe.getCell("C1").text),
      c2: readMe.getCell("C2").value,
    }).toEqual({
      stored: {
        provenanceStatus: "research_project_sample",
        materialPath: "rock_and_sediment.rock.igneous",
        manualGroupLabel: "Alps",
      },
      c2: null,
    });
  });

  it("should record no customization in an uncustomized template", () => {
    expect(sheet(SHEETS.readMe).getCell("C1").value).toBeNull();
  });
});

const SECTION_GROUPS: Record<TemplateSectionKey, ColumnGroup> = {
  identity: "Identity",
  sampleClassification: "Sample classification",
  location: "Location",
  geologicalContext: "Geological context",
  age: "Age",
  physicalDescription: "Physical description",
  scientificContext: "Scientific context",
  conservationSecurity: "Conservation and security",
  repository: "Curation and repository",
  relatedDocuments: "Related URL or document",
};

const PATH_COLUMNS = DATA_SHEETS.flatMap(({ columns }) => columns).filter(
  (column): column is Column & { path: string } => column.path !== undefined,
);

const REQUIRED_PATHS = REQUIRED_SAMPLE_COLUMNS.map(({ path }) => path);

const ALWAYS_KEPT_PATHS = ["parentIds", "processSteps"];

const CHECKED_BLOCKER_PATHS: Partial<Record<PublishBlocker, string>> = {
  location_position_missing: "location.position",
};

const isAlwaysIncluded = (path: string) =>
  REQUIRED_PATHS.includes(path) ||
  ALWAYS_KEPT_PATHS.some((kept) => isPathAtOrUnder(path, kept));

const fieldsCovering = (path: string) =>
  TEMPLATE_FIELDS.filter(({ paths }) =>
    paths.some((fieldPath) => isPathAtOrUnder(path, fieldPath)),
  );

describe("template fields", () => {
  it("should cover every optional column with exactly one field", () => {
    expect(
      PATH_COLUMNS.filter(
        ({ path }) =>
          !isAlwaysIncluded(path) && fieldsCovering(path).length !== 1,
      ).map(({ header }) => header),
    ).toEqual([]);
  });

  it("should match at least one column with every field path", () => {
    expect(
      TEMPLATE_FIELDS.flatMap(({ paths }) =>
        paths.filter(
          (fieldPath) =>
            !PATH_COLUMNS.some(({ path }) => isPathAtOrUnder(path, fieldPath)),
        ),
      ),
    ).toEqual([]);
  });

  it("should cover no column the import requires or always keeps", () => {
    expect(
      PATH_COLUMNS.filter(
        ({ path }) => isAlwaysIncluded(path) && fieldsCovering(path).length > 0,
      ).map(({ header }) => header),
    ).toEqual([]);
  });

  it("should keep every section holding a column the import requires or always keeps partly excludable", () => {
    expect(
      TEMPLATE_SECTION_KEYS.filter(
        (section) =>
          !PARTLY_EXCLUDABLE_TEMPLATE_SECTIONS.includes(section) &&
          PATH_COLUMNS.some(
            ({ path, group }) =>
              group === SECTION_GROUPS[section] && isAlwaysIncluded(path),
          ),
      ),
    ).toEqual([]);
  });

  it.each(PROVENANCE_STATUSES)(
    "should lock exactly the fields a %s needs to publish",
    (provenanceStatus) => {
      const blockerPaths = samplePublishBlockers(
        toPublishableFields({
          material: TEMPLATE_MATERIAL_PATHS.find(
            (path) => isMaterialComplete(path, null) && allowsLocation(path),
          ),
          scientificContext: { provenanceStatus, additionalRoles: [] },
        }),
      ).map(
        (blocker) =>
          CHECKED_BLOCKER_PATHS[blocker] ??
          PUBLISH_BLOCKER_PATH[blocker].join("."),
      );

      expect(
        TEMPLATE_FIELDS.filter(({ paths }) =>
          paths.some(
            (path) =>
              !(path in IMPORT_DEFAULTS) &&
              blockerPaths.some((blockerPath) =>
                isPathAtOrUnder(path, blockerPath),
              ),
          ),
        ).map(({ key }) => key),
      ).toEqual(
        Object.keys(
          lockedTemplateFields({ provenanceStatus, hasManualGroup: false }),
        ),
      );
    },
  );

  it("should keep the driver of every conditional column whenever that column stays", () => {
    expect(
      CONDITIONAL_FIELDS.flatMap((field) => {
        const condition = conditionOf(field);
        if (condition === undefined || isAlwaysIncluded(condition.path))
          return [];
        const driverFields = fieldsCovering(condition.path);
        return PATH_COLUMNS.filter(
          ({ path }) =>
            field.paths.some((governed) => isPathAtOrUnder(path, governed)) &&
            fieldsCovering(path).some(
              (governing) => !driverFields.includes(governing),
            ),
        ).map(({ header }) => header);
      }),
    ).toEqual([]);
  });

  it("should keep every column a field covers in its section's group", () => {
    expect(
      PATH_COLUMNS.flatMap(({ path, header, group }) =>
        fieldsCovering(path)
          .filter(({ section }) => SECTION_GROUPS[section] !== group)
          .map(({ key }) => `${key}: ${header}`),
      ),
    ).toEqual([]);
  });
});
