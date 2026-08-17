import type { ManualGroupListItem } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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
    id: "tag",
    header: () => m.column_tag(),
    cell: () => <Badge variant="secondary">{m.manual_group_tag()}</Badge>,
  },
  {
    accessorKey: "memberCount",
    header: () => m.column_members(),
    cell: ({ row }) => row.original.memberCount,
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
