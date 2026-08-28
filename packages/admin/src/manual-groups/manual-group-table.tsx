import type { ManualGroupListItem } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { ManagerCount } from "#/managers/manager-count.tsx";
import { m } from "#/paraglide/messages.js";

const columns: ColumnDef<ManualGroupListItem>[] = [
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => (
      <Link
        to="/manual-groups/$groupId"
        params={{ groupId: row.original.id }}
        className="hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "memberCount",
    header: () => m.column_members(),
    cell: ({ row }) => row.original.memberCount,
  },
  {
    accessorKey: "managerCount",
    header: () => m.column_managers(),
    cell: ({ row }) => <ManagerCount count={row.original.managerCount} />,
  },
];

export function ManualGroupTable({
  groups,
}: {
  groups: ManualGroupListItem[];
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.manual_groups_empty()}
      onRowClick={(group) =>
        void navigate({
          to: "/manual-groups/$groupId",
          params: { groupId: group.id },
        })
      }
    />
  );
}
