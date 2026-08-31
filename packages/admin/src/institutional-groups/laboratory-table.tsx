import type { Laboratory } from "@projet-igsn/domain/institutional-group/laboratory";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { managersColumn } from "#/institutional-groups/managers-column.tsx";
import { membersColumn } from "#/institutional-groups/members-column.ts";
import { m } from "#/paraglide/messages.js";

const laboratoryColumns = (
  memberCounts: Record<string, number>,
  managerCounts: Record<string, number>,
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
  membersColumn(memberCounts, (row) => row.code),
  managersColumn(managerCounts, (row) => row.code),
];

export function LaboratoryTable({
  laboratories,
  memberCounts,
  managerCounts,
}: {
  laboratories: Laboratory[];
  memberCounts: Record<string, number>;
  managerCounts: Record<string, number>;
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: laboratories,
    columns: laboratoryColumns(memberCounts, managerCounts),
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
