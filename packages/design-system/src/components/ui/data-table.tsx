import type { Table as TableInstance } from "@tanstack/react-table";

import { flexRender } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.tsx";

type DataTableProps<T> = {
  table: TableInstance<T>;
  emptyLabel: string;
  onRowClick: (row: T) => void;
};

export function DataTable<T>({
  table,
  emptyLabel,
  onRowClick,
}: DataTableProps<T>) {
  const rows = table.getRowModel().rows;

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
