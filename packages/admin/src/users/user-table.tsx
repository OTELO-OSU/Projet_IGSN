import type { AdminUser } from "@projet-igsn/domain/user/user-validator";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

import { UserStatusBadge } from "./user-status-badge.tsx";

const MAX_LISTED_GROUPS = 3;

const groupSummary = (groups: { name: string }[]) => {
  if (groups.length === 0) return m.user_value_missing();
  const listed = groups.slice(0, MAX_LISTED_GROUPS).map(({ name }) => name);
  return groups.length > MAX_LISTED_GROUPS
    ? `${listed.join(", ")} …`
    : listed.join(", ");
};

const columns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => (
      <Link
        to="/users/$userId"
        params={{ userId: row.original.id }}
        className="hover:underline"
      >
        {row.original.name ?? row.original.email}
      </Link>
    ),
  },
  {
    accessorKey: "firstname",
    header: () => m.column_firstname(),
    cell: ({ row }) => row.original.firstname,
  },
  {
    accessorKey: "email",
    header: () => m.column_email(),
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: "manualGroups",
    header: () => m.column_manual_groups(),
    cell: ({ row }) => groupSummary(row.original.manualGroups),
  },
  {
    accessorKey: "status",
    header: () => m.column_status(),
    cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
  },
];

export function UserTable({ users }: { users: AdminUser[] }) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.users_empty()}
      onRowClick={(user) =>
        void navigate({ to: "/users/$userId", params: { userId: user.id } })
      }
    />
  );
}
