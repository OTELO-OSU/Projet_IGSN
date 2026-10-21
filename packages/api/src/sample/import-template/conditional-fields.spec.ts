import {
  TEMPLATE_FIELD_DRIVERS,
  TEMPLATE_FIELDS,
} from "@projet-igsn/domain/sample/import/template-fields";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { scientificContextSchema } from "@projet-igsn/domain/sample/scientific-context/model";
import { describe, expect, it } from "vitest";

import { DATA_SHEETS, SAMPLE_COLUMNS } from "./columns.ts";
import {
  columnIndexesOf,
  CONDITIONAL_FIELDS,
  conditionalPromptOf,
  conditionOf,
  driverIndexOf,
} from "./conditional-fields.ts";
import { labels } from "./labels.ts";

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

  it("should grey every condition field but the three whose driver stays on a sheet their columns left", () => {
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
      "scientificContext.additionalRoles",
    ]);
  });

  it("should govern every template column exclusive to one provenance status by that status", () => {
    const variants = scientificContextSchema.options;
    const governedBy = (label: string) =>
      TEMPLATE_COLUMNS.flatMap(({ path }) =>
        path !== undefined &&
        CONDITIONAL_FIELDS.some((field) => {
          const condition = conditionOf(field);
          return (
            condition?.path === "scientificContext.provenanceStatus" &&
            condition.values.includes(label) &&
            field.paths.some((governed) => isPathAtOrUnder(path, governed))
          );
        })
          ? [path]
          : [],
      );
    const exclusiveTo = (variant: (typeof variants)[number]) =>
      TEMPLATE_COLUMNS.flatMap(({ path }) => {
        const [root, key] = path?.split(".") ?? [];
        return root === "scientificContext" &&
          key !== undefined &&
          key in variant.shape &&
          variants.some((other) => !(key in other.shape))
          ? [path!]
          : [];
      });

    expect(
      variants.map((variant) =>
        governedBy(
          labels.provenanceStatusLabel(variant.shape.provenanceStatus.value),
        ),
      ),
    ).toEqual(variants.map(exclusiveTo));
  });

  it("should compare the labels a cell holds, never a raw code", () => {
    const compared = CONDITIONAL_FIELDS.flatMap(
      (field) => conditionOf(field)?.values ?? [],
    );

    expect(compared.filter((value) => CODE_SHAPE.test(value))).toEqual([]);
  });

  it("should say why a sub-sample leaves its location empty", () => {
    expect(
      conditionalPromptOf("location.localityDescription", [], SAMPLE_COLUMNS),
    ).toMatch(
      /^Leave empty when "Parent IGSN" is filled, since a sub-sample inherits them from its parent\./,
    );
  });

  it("should restate no condition whose driver the template dropped", () => {
    const withoutParent = SAMPLE_COLUMNS.filter(
      ({ path }) => path !== "parentIds",
    );

    expect(
      conditionalPromptOf(
        "location.localityDescription",
        withoutParent,
        withoutParent,
      ),
    ).toBeUndefined();
  });

  it("should let a template drop a governed column only with its driver", () => {
    const templateKeysOf = (path: string) =>
      TEMPLATE_FIELDS.filter(({ paths }) =>
        paths.some(
          (owned) =>
            isPathAtOrUnder(path, owned) || isPathAtOrUnder(owned, path),
        ),
      ).map(({ key }) => key);
    const orphaned = CONDITIONAL_FIELDS.flatMap((field) => {
      const condition = conditionOf(field);
      const [driver] =
        condition === undefined ? [] : templateKeysOf(condition.path);
      if (driver === undefined) return [];
      return field.paths
        .flatMap(templateKeysOf)
        .filter(
          (key) => key !== driver && TEMPLATE_FIELD_DRIVERS[key] !== driver,
        )
        .map((key) => [key, driver]);
    });

    expect(orphaned).toEqual([]);
  });
});
