import type { ColumnDef } from "@tanstack/react-table";

import { ManagerCount } from "#/managers/manager-count.tsx";
import { m } from "#/paraglide/messages.js";

export function managersColumn<T>(
  counts: Record<string, number>,
  code: (row: T) => string,
): ColumnDef<T> {
  return {
    id: "managers",
    header: () => m.column_managers(),
    cell: ({ row }) => <ManagerCount count={counts[code(row.original)] ?? 0} />,
  };
}
