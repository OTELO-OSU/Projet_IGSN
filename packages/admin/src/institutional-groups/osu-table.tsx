import type { Osu } from "@projet-igsn/domain/institutional-group/osu";

import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";

const columns: ColumnDef<Osu>[] = [
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
    accessorKey: "organizationRor",
    header: () => m.field_institutional_organization(),
    cell: ({ row }) => organizationLabel(row.original.organizationRor),
  },
];

export function OsuTable({ osus }: { osus: Osu[] }) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: osus,
    columns,
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
