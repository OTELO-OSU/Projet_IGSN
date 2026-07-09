import type { Sample } from "@projet-igsn/domain/sample/sample";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@projet-igsn/design-system/components/ui/table";
import { formatDate } from "@projet-igsn/design-system/lib/format-date";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { m } from "#/paraglide/messages.js";
import { collectionMethodLabel } from "#/samples/collection-method-label.ts";
import { natureLabel } from "#/samples/nature-label.ts";

const columns: ColumnDef<Sample>[] = [
  {
    accessorKey: "igsn",
    header: () => m.column_igsn(),
    cell: ({ row }) => row.original.igsn,
  },
  {
    id: "status",
    // Derived, not stored: a sample is published exactly when it has an IGSN.
    // The accessor drives sorting; the first click sorts ascending (drafts
    // first), which numeric accessors would otherwise invert.
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
    // The row's onClick is mouse-only; this link is the keyboard and
    // assistive-tech path to the same page.
    cell: ({ row }) => (
      <Link
        to="/samples/$sampleId"
        params={{ sampleId: row.original.id }}
        className="hover:underline"
      >
        {row.original.name}
      </Link>
    ),
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
    accessorKey: "updatedAt",
    header: () => m.column_last_modified(),
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
];

export function SampleTable({ samples }: { samples: Sample[] }) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: samples,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-muted-foreground italic"
            >
              {m.samples_empty()}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() =>
                navigate({
                  to: "/samples/$sampleId",
                  params: { sampleId: row.original.id },
                })
              }
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
