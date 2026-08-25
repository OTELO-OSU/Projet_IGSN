import type { ListedUser } from "@projet-igsn/domain/user/user-validator";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

import { RemoveUserInstitutionButton } from "./remove-user-institution-button.tsx";
import { UserStatusBadge } from "./user-status-badge.tsx";

const MAX_LISTED_GROUPS = 3;

const groupSummary = (groups: { name: string }[]) => {
  if (groups.length === 0) return m.user_value_missing();
  const listed = groups.slice(0, MAX_LISTED_GROUPS).map(({ name }) => name);
  return groups.length > MAX_LISTED_GROUPS
    ? `${listed.join(", ")} …`
    : listed.join(", ");
};

const columns: ColumnDef<ListedUser>[] = [
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
  {
    id: "removeInstitution",
    header: () => m.user_remove_institution_action(),
    cell: ({ row }) =>
      shouldRePendOnInstitutionsUpdate(row.original, null) ? (
        <RemoveUserInstitutionButton user={row.original} />
      ) : null,
  },
];

export function UserTable({ users }: { users: ListedUser[] }) {
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
