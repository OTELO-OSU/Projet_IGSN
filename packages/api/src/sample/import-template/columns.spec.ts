import type { z } from "zod";

import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { describe, expect, it } from "vitest";

import type { Column } from "./columns.ts";

import {
  CHILD_SHEETS,
  DATA_SHEETS,
  DEFERRED_FIELDS,
  IDENTIFIER_ONLY_FIELDS,
  REQUIRED_MARKER,
  SAMPLE_COLUMNS,
  SHEETS,
} from "./columns.ts";

type SchemaDefinition = {
  type: string;
  innerType?: z.ZodType;
  out?: z.ZodType;
  getter?: () => z.ZodType;
  shape?: Record<string, z.ZodType>;
  options?: readonly z.ZodType[];
  element?: z.ZodType;
};

const WRAPPERS = [
  "optional",
  "nullable",
  "default",
  "prefault",
  "nonoptional",
  "readonly",
  "catch",
];

const definitionOf = (schema: z.ZodType): SchemaDefinition =>
  (schema as unknown as { _zod: { def: SchemaDefinition } })._zod.def;

function leafPaths(schema: z.ZodType, prefix: string): string[] {
  const definition = definitionOf(schema);
  if (definition.innerType && WRAPPERS.includes(definition.type)) {
    return leafPaths(definition.innerType, prefix);
  }
  if (definition.type === "pipe" && definition.out) {
    return leafPaths(definition.out, prefix);
  }
  if (definition.type === "lazy" && definition.getter) {
    return leafPaths(definition.getter(), prefix);
  }
  if (definition.type === "object" && definition.shape) {
    return Object.entries(definition.shape).flatMap(([key, value]) =>
      leafPaths(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  if (definition.type === "union" && definition.options) {
    return definition.options.flatMap((option) => leafPaths(option, prefix));
  }
  if (definition.type === "array" && definition.element) {
    return leafPaths(definition.element, prefix);
  }
  return [prefix];
}

const EXCLUDED = [...DEFERRED_FIELDS, ...IDENTIFIER_ONLY_FIELDS];

const isTemplated = (path: string) =>
  !EXCLUDED.some((field) => path === field || path.startsWith(`${field}.`));

const unique = (paths: readonly string[]) => [...new Set(paths)].sort();

const READING_PATHS = [
  "condition.temperature.type",
  "condition.temperature.measurement.value",
  "condition.temperature.measurement.unit",
  "condition.pressure.type",
  "condition.pressure.measurement.value",
  "condition.pressure.measurement.unit",
  "condition.humidity.type",
  "condition.humidity.percentage",
  "condition.light",
];

const pathsOf = (columns: readonly Column[]) =>
  columns.flatMap((column) => (column.path === undefined ? [] : [column.path]));

describe("import template columns", () => {
  it.each(DATA_SHEETS)(
    "should head every $name column with a unique human label, never its schema path",
    ({ columns }) => {
      const headers = columns.map((column) => column.header);

      expect({
        technical: columns
          .filter(
            (column) =>
              column.header === column.path || column.header.includes("."),
          )
          .map((column) => column.header),
        duplicates: headers.filter(
          (header, index) => headers.indexOf(header) !== index,
        ),
      }).toEqual({ technical: [], duplicates: [] });
    },
  );

  it("should mark the header of a field whose absence blocks publication, a hierarchy on its first level only", () => {
    const headerOf = (path: string, level?: number) =>
      SAMPLE_COLUMNS.find(
        (column) => column.path === path && column.level === level,
      )?.header;

    expect({
      blocker: headerOf("nature"),
      hierarchyFirstLevel: headerOf("material", 1),
      hierarchyDeeperLevel: headerOf("material", 2),
      notABlocker: headerOf("specificName"),
    }).toEqual({
      blocker: `Nature${REQUIRED_MARKER}`,
      hierarchyFirstLevel: `Material (level 1)${REQUIRED_MARKER}`,
      hierarchyDeeperLevel: "Material (level 2)",
      notABlocker: "Specific name",
    });
  });

  it.each([
    ["scientificContext.funderOrganizations", SHEETS.funderOrganizations],
    ["scientificContext.hostInstitution", SHEETS.hostInstitutions],
    ["economicInterestElements", SHEETS.elementsOfInterest],
    ["condition.storageConditions", SHEETS.storageConditions],
  ])(
    "should carry the several values of %s one per row on its own tab, never as a Samples column",
    (path, name) => {
      expect({
        onSamples: SAMPLE_COLUMNS.some((column) => column.path === path),
        onTab: CHILD_SHEETS.find((child) => child.name === name)
          ?.columns.slice(0, 3)
          .map((column) => column.path),
      }).toEqual({ onSamples: false, onTab: [undefined, undefined, path] });
    },
  );

  it("should carry every storage-condition reading on that tab beside the condition licensing it, never on Samples", () => {
    expect({
      onTab: pathsOf(
        CHILD_SHEETS.find((child) => child.name === SHEETS.storageConditions)
          ?.columns ?? [],
      ),
      onSamples: pathsOf(SAMPLE_COLUMNS).filter((path) =>
        READING_PATHS.includes(path),
      ),
    }).toEqual({
      onTab: ["condition.storageConditions", ...READING_PATHS],
      onSamples: [],
    });
  });

  it("should carry a column for every createSampleSchema leaf but the deferred and identifier-only ones", () => {
    const columns = [
      ...SAMPLE_COLUMNS,
      ...CHILD_SHEETS.flatMap((child) => child.columns),
    ];

    const covered = columns.flatMap((column) => [
      ...(column.path === undefined ? [] : [column.path]),
      ...(column.covers ?? []),
    ]);

    expect(unique(covered)).toEqual(
      unique(leafPaths(createSampleSchema, "").filter(isTemplated)),
    );
  });

  it("should only let a column cover a sibling of its own path", () => {
    const parentOf = (path: string) => path.split(".").slice(0, -1).join(".");
    const strays = DATA_SHEETS.flatMap((sheet) =>
      sheet.columns.flatMap((column) =>
        (column.covers ?? []).filter(
          (covered) =>
            column.path === undefined ||
            parentOf(covered) !== parentOf(column.path),
        ),
      ),
    );

    expect(strays).toEqual([]);
  });
});
