import type { Column } from "./columns.ts";

export const blockIdOf = (column: Column): string | undefined =>
  column.block === undefined
    ? undefined
    : column.level === undefined
      ? column.block
      : `${column.block}_${column.level}`;
