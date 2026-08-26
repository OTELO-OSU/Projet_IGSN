import type {
  Column,
  RowData,
  Table as TableInstance,
} from "@tanstack/react-table";

import { flexRender } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.tsx";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

function ariaSort<T>(column: Column<T, unknown>) {
  if (column.columnDef.enableSorting !== true) return undefined;
  const sorted = column.getIsSorted();
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
}

type DataTableProps<T> = {
  table: TableInstance<T>;
  emptyLabel: string;
  onRowClick: (row: T) => void;
  className?: string;
};

export function DataTable<T>({
  table,
  emptyLabel,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const rows = table.getRowModel().rows;

  return (
    <Table className={className}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                scope="col"
                aria-sort={ariaSort(header.column)}
                className={header.column.columnDef.meta?.className}
              >
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
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={table.getAllColumns().length}
              className="text-muted-foreground italic"
            >
              {emptyLabel}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => onRowClick(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cell.column.columnDef.meta?.className}
                >
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
