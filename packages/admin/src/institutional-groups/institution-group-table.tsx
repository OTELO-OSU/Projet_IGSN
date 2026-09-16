import type { Laboratory } from "@projet-igsn/domain/institutional-group/laboratory";
import type { Organization } from "@projet-igsn/domain/institutional-group/organization";
import type { Osu } from "@projet-igsn/domain/institutional-group/osu";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { Link } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { managersColumn } from "#/institutional-groups/managers-column.tsx";
import { membersColumn } from "#/institutional-groups/members-column.ts";
import { m } from "#/paraglide/messages.js";

type Counts = Record<string, number>;

export const organizationColumns = (
  memberCounts: Counts,
  managerCounts: Counts,
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
  membersColumn(memberCounts, (row) => row.ror),
  managersColumn(managerCounts, (row) => row.ror),
];

export const laboratoryColumns = (
  memberCounts: Counts,
  managerCounts: Counts,
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

export const osuColumns = (
  memberCounts: Counts,
  managerCounts: Counts,
): ColumnDef<Osu>[] => [
  {
    accessorKey: "code",
    header: () => m.column_code(),
    cell: ({ row }) => (
      <Link
        to="/institutional-groups/osus/$code"
        params={{ code: row.original.code }}
        className="hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "organizationRors",
    header: () => m.column_institutional_organizations(),
    cell: ({ row }) => (
      <ul>
        {row.original.organizationRors.map((ror) => (
          <li key={ror}>{organizationLabel(ror)}</li>
        ))}
      </ul>
    ),
  },
  membersColumn(memberCounts, (row) => row.code),
  managersColumn(managerCounts, (row) => row.code),
];

export function InstitutionGroupTable<T>({
  rows,
  columns,
  emptyLabel,
  onRowClick,
}: {
  rows: T[];
  columns: ColumnDef<T>[];
  emptyLabel: string;
  onRowClick: (row: T) => void;
}) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable table={table} emptyLabel={emptyLabel} onRowClick={onRowClick} />
  );
}
