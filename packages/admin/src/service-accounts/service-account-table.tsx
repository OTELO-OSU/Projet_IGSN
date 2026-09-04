import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import {
  laboratoryShortLabel,
  organizationShortLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

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
    id: "institution",
    header: () => m.column_institutional_group(),
    cell: ({ row }) => {
      const {
        institutionalOrganization,
        institutionalOsu,
        institutionalLaboratory,
      } = row.original;
      const labels = [
        institutionalOrganization &&
          organizationShortLabel(institutionalOrganization),
        institutionalOsu,
        institutionalLaboratory &&
          laboratoryShortLabel(institutionalLaboratory),
      ].filter(Boolean);
      return labels.length === 0 ? (
        m.user_value_missing()
      ) : (
        <ul>
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
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
