import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import {
  laboratoryShortLabel,
  organizationShortLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";
import { ServiceAccountActiveMark } from "#/service-accounts/service-account-active-mark.tsx";

const columns: ColumnDef<ServiceAccount>[] = [
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => (
      <Link
        to="/service-accounts/$accountId"
        params={{ accountId: row.original.id }}
        className="hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    id: "active",
    header: () => m.column_active(),
    cell: ({ row }) => (
      <ServiceAccountActiveMark active={row.original.hasApiKey} />
    ),
  },
  {
    id: "owner",
    header: () => m.column_owner(),
    cell: ({ row }) => fullName(row.original.owner) || row.original.owner.email,
  },
  {
    id: "institution",
    header: () => m.column_institutional_group(),
    cell: ({ row }) => {
      const {
        institutionalOrganization,
        institutionalOsu,
        institutionalLaboratory,
      } = row.original;
      return (
        <ul>
          <li>{organizationShortLabel(institutionalOrganization)}</li>
          {institutionalOsu && <li>{institutionalOsu}</li>}
          <li>{laboratoryShortLabel(institutionalLaboratory)}</li>
        </ul>
      );
    },
  },
];

export function ServiceAccountTable({
  accounts,
}: {
  accounts: ServiceAccount[];
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: accounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.service_accounts_empty()}
      onRowClick={(account) =>
        void navigate({
          to: "/service-accounts/$accountId",
          params: { accountId: account.id },
        })
      }
    />
  );
}
