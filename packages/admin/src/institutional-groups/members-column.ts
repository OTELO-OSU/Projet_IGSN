import type { ColumnDef } from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

export function membersColumn<T>(
  counts: Record<string, number>,
  code: (row: T) => string,
): ColumnDef<T> {
  return {
    id: "members",
    header: () => m.column_members(),
    cell: ({ row }) => counts[code(row.original)] ?? 0,
  };
}
