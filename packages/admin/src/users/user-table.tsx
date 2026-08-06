import type { User } from "@projet-igsn/domain/user/model";

import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { DataTable } from "#/data-table.tsx";
import { m } from "#/paraglide/messages.js";

import { userStatusLabel } from "./user-status-label.ts";

const columns: ColumnDef<User>[] = [
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
    accessorKey: "status",
    header: () => m.column_status(),
    cell: ({ row }) => userStatusLabel(row.original.status),
  },
];

export function UserTable({ users }: { users: User[] }) {
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
