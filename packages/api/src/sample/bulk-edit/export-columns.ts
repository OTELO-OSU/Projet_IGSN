import type { Column } from "../import-template/columns.ts";

import { SAMPLE_COLUMNS } from "../import-template/columns.ts";

export const EXPORT_SAMPLE_COLUMNS: readonly Column[] = SAMPLE_COLUMNS.flatMap(
  (column): Column[] =>
    column.path === "name"
      ? [
          column,
          { header: "IGSN", group: column.group, path: "igsn" },
          {
            header: "Parent IGSN",
            group: column.group,
            path: "parents.igsn",
          },
        ]
      : [column],
);
