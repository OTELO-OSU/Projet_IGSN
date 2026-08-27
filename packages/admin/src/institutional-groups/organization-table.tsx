import type { Organization } from "@projet-igsn/domain/institutional-group/organization";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { membersColumn } from "#/institutional-groups/members-column.ts";
import { m } from "#/paraglide/messages.js";

const organizationColumns = (
  counts: Record<string, number>,
): ColumnDef<Organization>[] => [
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
  membersColumn(counts, (row) => row.ror),
];

export function OrganizationTable({
  organizations,
  memberCounts,
}: {
  organizations: Organization[];
  memberCounts: Record<string, number>;
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: organizations,
    columns: organizationColumns(memberCounts),
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
