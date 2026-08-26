import type { Laboratory } from "@projet-igsn/domain/institutional-group/laboratory";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { membersColumn } from "#/institutional-groups/members-column.ts";
import { m } from "#/paraglide/messages.js";

const laboratoryColumns = (
  counts: Record<string, number>,
): ColumnDef<Laboratory>[] => [
  {
    accessorKey: "code",
    header: () => m.column_code(),
    cell: ({ row }) => (
      <Link
        to="/institutional-groups/laboratories/$code"
        params={{ code: row.original.code }}
        className="hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "acronym",
    header: () => m.column_acronym(),
    cell: ({ row }) => row.original.acronym,
  },
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => row.original.name,
  },
  membersColumn(counts, (row) => row.code),
];

export function LaboratoryTable({
  laboratories,
  memberCounts,
}: {
  laboratories: Laboratory[];
  memberCounts: Record<string, number>;
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: laboratories,
    columns: laboratoryColumns(memberCounts),
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
