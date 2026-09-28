import type { Column } from "../import-template/columns.ts";

import {
  CHILD_SHEETS,
  SAMPLE_COLUMNS,
  SAMPLE_KEY_HEADER,
} from "../import-template/columns.ts";

export const EXPORT_KEY_HEADER = "IGSN";

const IGSN_COLUMN: Column = {
  header: EXPORT_KEY_HEADER,
  group: "Sample",
  path: "igsn",
};

const withIgsnKey = (column: Column): Column =>
  column.header === SAMPLE_KEY_HEADER ? IGSN_COLUMN : column;

export const EXPORT_SAMPLE_COLUMNS: readonly Column[] = SAMPLE_COLUMNS.flatMap(
  (column) =>
    column.path === "name"
      ? [
          column,
          { header: "Parent IGSN", group: column.group, path: "parents.igsn" },
        ]
      : [withIgsnKey(column)],
);

export const EXPORT_CHILD_SHEETS: typeof CHILD_SHEETS = CHILD_SHEETS.map(
  (sheet) => ({ ...sheet, columns: sheet.columns.map(withIgsnKey) }),
);
