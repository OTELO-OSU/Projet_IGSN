import { REQUIRED_MARKER } from "@projet-igsn/domain/sample/import/template-header";
import { describe, expect, it } from "vitest";

import type { Column } from "./columns.ts";

import { COLUMN_KINDS } from "./column-kind.ts";
import {
  CHILD_SHEETS,
  DATA_SHEETS,
  SAMPLE_COLUMNS,
  SHEETS,
} from "./columns.ts";

const DEFERRED_FIELDS = ["syntheticDetails", "mineralClassifications"];

const ATTACHMENT_ID_FIELD = "attachments.id";

const BULK_EDIT_ONLY_FIELDS = ["childIds"];

const ATTACHMENT_FILE_NAME_FIELD = "attachments.name";

// TODO(phase 3): these carry a uuid a researcher cannot type; drop them from this list once the importer resolves people by name.
const IDENTIFIER_ONLY_FIELDS = [
  "scientificContext.chiefScientistUserId",
  "scientificContext.collectorUserId",
  "scientificContext.additionalRoles.personUserId",
];

const COVERED_BY_REGION_LEVEL_2 = ["location.region.oceanSea"];

const EXCLUDED = [
  ...DEFERRED_FIELDS,
  ...IDENTIFIER_ONLY_FIELDS,
  ...BULK_EDIT_ONLY_FIELDS,
  ATTACHMENT_ID_FIELD,
];

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
      optionalParent: headerOf("parentIds"),
    }).toEqual({
      blocker: `Nature${REQUIRED_MARKER}`,
      hierarchyFirstLevel: `Material (level 1)${REQUIRED_MARKER}`,
      hierarchyDeeperLevel: "Material (level 2)",
      notABlocker: "Specific name",
      optionalParent: "Parent IGSN",
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

  it("should carry each attachment's metadata beside the file name it describes on the Attachments tab, never on Samples", () => {
    expect({
      onTab: pathsOf(
        CHILD_SHEETS.find((child) => child.name === SHEETS.attachments)
          ?.columns ?? [],
      ),
      onSamples: pathsOf(SAMPLE_COLUMNS).filter((path) =>
        path.startsWith("attachments"),
      ),
    }).toEqual({
      onTab: [
        ATTACHMENT_FILE_NAME_FIELD,
        "attachments.title",
        "attachments.targetResourceType",
        "attachments.description",
      ],
      onSamples: [],
    });
  });

  it("should carry a column for every createSampleSchema leaf but the deferred and identifier-only ones", () => {
    const columns = [
      ...SAMPLE_COLUMNS,
      ...CHILD_SHEETS.flatMap((child) => child.columns),
    ];

    const covered = [
      ...pathsOf(columns).filter((path) => path !== ATTACHMENT_FILE_NAME_FIELD),
      ...COVERED_BY_REGION_LEVEL_2,
    ];

    expect(unique(covered)).toEqual(
      unique([...COLUMN_KINDS.keys()].filter(isTemplated)),
    );
  });
});
