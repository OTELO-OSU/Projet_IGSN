import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { formatDate } from "@projet-igsn/domain/date/format-date";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";
import { collectionMethodLabel, natureLabel } from "#/samples/sample-labels.ts";
import { UserInitials } from "#/users/user-initials.tsx";

const CAPPED_NAME_CLASS = "block max-w-48 wrap-break-word";

const columns: ColumnDef<AdminSampleListItem>[] = [
  {
    accessorKey: "igsn",
    header: () => m.column_igsn(),
    cell: ({ row }) => row.original.igsn,
  },
  {
    id: "status",
    accessorFn: (sample) => (sample.igsn ? 1 : 0),
    sortDescFirst: false,
    header: ({ column }) => (
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className="cursor-pointer"
      >
        {m.column_status()}
        {{ asc: " ↑", desc: " ↓" }[column.getIsSorted() as string] ?? ""}
      </button>
    ),
    cell: ({ row }) =>
      row.original.igsn ? (
        <Badge className="bg-green-100 text-green-800" variant="secondary">
          {m.status_published()}
        </Badge>
      ) : (
        <Badge variant="secondary">{m.status_draft()}</Badge>
      ),
  },
  {
    accessorKey: "name",
    header: () => m.column_name(),
    cell: ({ row }) => (
      <Link
        to="/samples/$sampleId"
        params={{ sampleId: row.original.id }}
        className={`${CAPPED_NAME_CLASS} hover:underline`}
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "specificName",
    header: () => m.column_specific_name(),
    cell: ({ row }) =>
      row.original.specificName ? (
        <span className={CAPPED_NAME_CLASS}>{row.original.specificName}</span>
      ) : null,
  },
  {
    accessorKey: "nature",
    header: () => m.column_nature(),
    cell: ({ row }) => natureLabel(row.original.nature),
  },
  {
    accessorKey: "collectionMethod",
    header: () => m.column_collection_method(),
    cell: ({ row }) =>
      row.original.collectionMethod
        ? collectionMethodLabel(row.original.collectionMethod)
        : "",
  },
  {
    id: "owner",
    header: () => m.column_owner(),
    cell: ({ row }) => {
      const owner = row.original.owner;
      return owner ? (
        <UserInitials name={owner.name} firstname={owner.firstname} />
      ) : null;
    },
  },
  {
    accessorKey: "updatedAt",
    header: () => m.column_last_modified(),
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
];

type SampleTableProps = {
  samples: AdminSampleListItem[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

export function SampleTable({
  samples,
  sorting,
  onSortingChange,
}: SampleTableProps) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: samples,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange,
  });

  return (
    <DataTable
      table={table}
      emptyLabel={m.samples_empty()}
      onRowClick={(sample) =>
        void navigate({
          to: "/samples/$sampleId",
          params: { sampleId: sample.id },
        })
      }
    />
  );
}
