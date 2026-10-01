import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import type { TemplateCustomization } from "./customization.ts";

import { DATA_SHEETS, plainHeader, SAMPLE_COLUMNS, SHEETS } from "./columns.ts";
import {
  droppedColumnsOf,
  prefilledHeaderLabelsOf,
  prefillOf,
  readCustomization,
} from "./customization.ts";

const TEMPLATE_COLUMNS = DATA_SHEETS.flatMap((sheet) => sheet.columns);

const readMeBook = () => {
  const book = new ExcelJS.Workbook();
  return { book, sheet: book.addWorksheet(SHEETS.readMe) };
};

describe("import template customization", () => {
  it.each<[string, TemplateCustomization, string[]]>([
    [
      "a field sample drops the collection specimen fields",
      { provenanceStatus: "field_sample" },
      [
        "scientificContext.collectionOrigin",
        "scientificContext.collectionContextDescription",
      ],
    ],
    [
      "a collection specimen drops the field sample fields, child sheets included",
      { provenanceStatus: "collection_specimen" },
      [
        "scientificContext.chiefScientistFirstname",
        "scientificContext.chiefScientistLastname",
        "scientificContext.funding",
        "scientificContext.researchProgramName",
        "scientificContext.researchProgramDescription",
        "scientificContext.platformType",
        "scientificContext.launchPlatformName",
        "scientificContext.additionalRoles.role",
        "scientificContext.additionalRoles.personFirstname",
        "scientificContext.additionalRoles.personLastname",
        "scientificContext.funderOrganizations",
        "scientificContext.hostInstitution",
      ],
    ],
    [
      "a fixed igneous rock drops the metamorphic fields but keeps the texture its descendants may take",
      { materialPath: "rock_and_sediment.rock.igneous" },
      ["metamorphicFacies", "metamorphicFabric"],
    ],
    [
      "a fixed unknown rock drops the specific name its own level excludes",
      { materialPath: "rock_and_sediment.rock.unknown" },
      ["texture", "metamorphicFacies", "metamorphicFabric", "specificName"],
    ],
    [
      "a fixed extraterrestrial rock keeps the location a deeper level may still allow",
      { materialPath: "rock_and_sediment.extraterrestrial_rock" },
      ["texture", "metamorphicFacies", "metamorphicFabric"],
    ],
    ["no customization drops nothing", {}, []],
  ])(
    "should drop the columns no row can fill when %s",
    (_, customization, dropped) => {
      expect(
        droppedColumnsOf(TEMPLATE_COLUMNS, customization).map(
          (column) => column.path,
        ),
      ).toEqual(dropped);
    },
  );

  it("should pre-fill the provenance status, the manual group and each material level down to the fixed depth with its label", () => {
    const prefill = prefillOf({
      provenanceStatus: "field_sample",
      materialPath: "rock_and_sediment.rock.igneous",
      manualGroupLabel: "Alps",
    });

    expect(
      SAMPLE_COLUMNS.flatMap((column) => {
        const label = prefill(column);
        return label === undefined ? [] : [[plainHeader(column), label]];
      }),
    ).toEqual([
      ["Provenance status", "Field sample"],
      ["Manual group", "Alps"],
      ["Material (level 1)", "Rock and sediment"],
      ["Material (level 2)", "Rock"],
      ["Material (level 3)", "Igneous"],
    ]);
  });

  it("should treat the default existence and availability statuses as pre-filled in an uncustomized file", () => {
    expect([...prefilledHeaderLabelsOf(undefined)]).toEqual([
      ["Existence status", "Exists"],
      ["Availability status", "Available"],
    ]);
  });

  it.each([
    ["no JSON", "field_sample"],
    ["an unknown provenance status", '{"provenanceStatus":"lost"}'],
    [
      "a material outside the template",
      '{"materialPath":"rock_and_sediment.nope"}',
    ],
  ])("should read a Read me C1 holding %s as no customization", (_, text) => {
    const { book, sheet } = readMeBook();
    sheet.getCell("C1").value = text;

    expect(readCustomization(book)).toBeUndefined();
  });
});
