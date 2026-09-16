import type { Osu } from "@projet-igsn/domain/institutional-group/osu";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { managersColumn } from "#/institutional-groups/managers-column.tsx";
import { membersColumn } from "#/institutional-groups/members-column.ts";
import { m } from "#/paraglide/messages.js";

const osuColumns = (
  memberCounts: Record<string, number>,
  managerCounts: Record<string, number>,
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

export function OsuTable({
  osus,
  memberCounts,
  managerCounts,
}: {
  osus: Osu[];
  memberCounts: Record<string, number>;
  managerCounts: Record<string, number>;
}) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: osus,
    columns: osuColumns(memberCounts, managerCounts),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.group_osus_empty()}
      onRowClick={(osu) =>
        void navigate({
          to: "/institutional-groups/osus/$code",
          params: { code: osu.code },
        })
      }
    />
  );
}
