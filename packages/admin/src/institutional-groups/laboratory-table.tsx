import type { Laboratory } from "@projet-igsn/domain/institutional-group/laboratory";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

const columns: ColumnDef<Laboratory>[] = [
  {
    accessorKey: "acronym",
    header: () => m.column_acronym(),
    cell: ({ row }) => (
      <Link
        to="/institutional-groups/laboratories/$code"
        params={{ code: row.original.code }}
        className="hover:underline"
      >
        {row.original.acronym}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => row.original.name,
  },
];

export function LaboratoryTable({
  laboratories,
}: {
  laboratories: Laboratory[];
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: laboratories,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.group_laboratories_empty()}
      onRowClick={(laboratory) =>
        void navigate({
          to: "/institutional-groups/laboratories/$code",
          params: { code: laboratory.code },
        })
      }
    />
  );
}
