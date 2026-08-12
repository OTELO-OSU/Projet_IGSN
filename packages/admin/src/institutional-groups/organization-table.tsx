import type { Organization } from "@projet-igsn/domain/institutional-group/organization";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: "ror",
    header: () => m.column_ror(),
    cell: ({ row }) => (
      <Link
        to="/institutional-groups/organizations/$ror"
        params={{ ror: row.original.ror }}
        className="hover:underline"
      >
        {row.original.ror}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "acronym",
    header: () => m.column_acronym(),
    cell: ({ row }) => row.original.acronym,
  },
];

export function OrganizationTable({
  organizations,
}: {
  organizations: Organization[];
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: organizations,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.group_organizations_empty()}
      onRowClick={(organization) =>
        void navigate({
          to: "/institutional-groups/organizations/$ror",
          params: { ror: organization.ror },
        })
      }
    />
  );
}
