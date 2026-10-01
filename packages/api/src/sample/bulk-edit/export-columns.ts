import type { Column } from "../import-template/columns.ts";

import { SAMPLE_COLUMNS } from "../import-template/columns.ts";

export const EXPORT_SAMPLE_COLUMNS: readonly Column[] = SAMPLE_COLUMNS.flatMap(
  (column): Column[] => {
    if (column.path === "name")
      return [column, { header: "IGSN", group: column.group, path: "igsn" }];
    return column.path === "parentIds"
      ? [{ ...column, path: "parents.igsn" }]
      : [column];
  },
);
