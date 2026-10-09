import type { Column } from "../import-template/columns.ts";

import {
  CHILD_SHEETS,
  CHILDREN_IGSNS_HEADER,
  SAMPLE_COLUMNS,
  SHEETS,
} from "../import-template/columns.ts";

export const EXPORT_SAMPLE_COLUMNS: readonly Column[] = SAMPLE_COLUMNS.flatMap(
  (column): Column[] => {
    if (column.path === "name")
      return [column, { header: "IGSN", group: column.group, path: "igsn" }];
    return column.path === "parentIds"
      ? [
          { ...column, path: "parents.igsn" },
          {
            header: CHILDREN_IGSNS_HEADER,
            group: column.group,
            path: "children.igsn",
          },
        ]
      : [column];
  },
);

export const EXPORT_CHILD_SHEETS = CHILD_SHEETS.filter(
  ({ name }) => name !== SHEETS.attachments,
);
