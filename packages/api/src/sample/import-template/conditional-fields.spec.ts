import { describe, expect, it } from "vitest";

import { DATA_SHEETS } from "./columns.ts";
import {
  columnIndexesOf,
  CONDITIONAL_FIELDS,
  conditionOf,
  driverIndexOf,
} from "./conditional-fields.ts";

const CODE_SHAPE = /^[a-z0-9]+(_[a-z0-9]+)*$/;

const TEMPLATE_COLUMNS = DATA_SHEETS.flatMap((sheet) => sheet.columns);

describe("import template conditional fields", () => {
  it("should resolve every governed path and every driving column to a template column", () => {
    const unresolved = CONDITIONAL_FIELDS.flatMap((field) => {
      const condition = conditionOf(field);
      return [
        ...field.paths.filter(
          (path) => columnIndexesOf(TEMPLATE_COLUMNS, path).length === 0,
        ),
        ...(condition !== undefined &&
        driverIndexOf(TEMPLATE_COLUMNS, condition) < 0
          ? [condition.path]
          : []),
      ];
    });

    expect(unresolved).toEqual([]);
  });

  it("should grey every condition field but the two whose driver stays on a sheet their columns left", () => {
    const ungreyed = CONDITIONAL_FIELDS.flatMap((field) => {
      const condition = conditionOf(field);
      if (condition === undefined) return [];
      return field.paths.filter(
        (path) =>
          !DATA_SHEETS.some(
            (sheet) =>
              columnIndexesOf(sheet.columns, path).length > 0 &&
              driverIndexOf(sheet.columns, condition) >= 0,
          ),
      );
    });

    expect(ungreyed).toEqual([
      "scientificContext.funderOrganizations",
      "scientificContext.hostInstitution",
    ]);
  });

  it("should compare the labels a cell holds, never a raw code", () => {
    const compared = CONDITIONAL_FIELDS.flatMap(
      (field) => conditionOf(field)?.values ?? [],
    );

    expect(compared.filter((value) => CODE_SHAPE.test(value))).toEqual([]);
  });
});
