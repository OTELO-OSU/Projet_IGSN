import type { PublicListedSample } from "@projet-igsn/domain/sample/sample-validator";

import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import {
  DataTable,
  STICKY_CELL_BACKGROUND,
} from "@projet-igsn/design-system/components/ui/data-table";
import { TruncatedText } from "@projet-igsn/design-system/components/ui/truncated-text";
import { useSearchHighlight } from "@projet-igsn/design-system/lib/use-search-highlight";
import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type Table,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRef } from "react";

import {
  collectorText,
  locationText,
  materialText,
  selectedCardFields,
  typeNatureText,
} from "#/domain/samples/card-fields.ts";
import { m } from "#/paraglide/messages.js";

type TableSample = PublicListedSample & { igsn: string };

const hasIgsn = (sample: PublicListedSample): sample is TableSample =>
  sample.igsn !== null;

type TextColumn = {
  id: string;
  label: () => string;
  text: (sample: TableSample) => string | null;
  truncate?: "start";
  highlight?: true;
  className?: string;
};

const INTERNAL_NUMBER_COLUMN: TextColumn = {
  id: "internalNumber",
  label: m.card_field_internal_id,
  text: ({ internalNumber }) =>
    internalNumber === null ? null : formatInternalId(internalNumber),
  className: "w-32",
};

const CARD_COLUMNS: readonly TextColumn[] = [
  {
    id: "typeNature",
    label: m.card_field_type_nature,
    text: typeNatureText,
  },
  {
    id: "material",
    label: m.sample_field_material,
    text: materialText,
    truncate: "start",
    highlight: true,
  },
  {
    id: "location",
    label: m.card_field_location,
    text: (sample) => locationText(sample.location),
  },
  {
    id: "collectorName",
    label: m.sample_field_collector_name,
    text: collectorText,
  },
];

function textColumn({
  id,
  label,
  text,
  truncate,
  highlight,
  className,
}: TextColumn): ColumnDef<TableSample> {
  return {
    id,
    header: () => label(),
    cell: ({ row }) => {
      const value = text(row.original);
      return (
        value !== null && (
          <TruncatedText truncate={truncate} highlight={highlight}>
            {value}
          </TruncatedText>
        )
      );
    },
    meta: { className: `${className ?? "w-40"} truncate` },
  };
}

function pageCheckbox(table: Table<TableSample>, maxSelected: number) {
  const rows = table.getRowModel().rows;
  const checkedOnPage = rows.filter((row) => row.getIsSelected()).length;
  const checked = Object.keys(table.getState().rowSelection).length;
  const isPageChecked = checkedOnPage === rows.length;
  return (
    <Checkbox
      aria-label={m.samples_select_page()}
      checked={isPageChecked || (checkedOnPage > 0 && "indeterminate")}
      disabled={
        !isPageChecked && checked - checkedOnPage + rows.length > maxSelected
      }
      onCheckedChange={(next) => table.toggleAllPageRowsSelected(next === true)}
    />
  );
}

function sampleColumns(
  fields: string[],
  maxSelected: number,
): ColumnDef<TableSample>[] {
  return [
    {
      id: "select",
      header: ({ table }) => pageCheckbox(table, maxSelected),
      cell: ({ row }) => (
        <label
          className="absolute inset-0 flex cursor-pointer items-center pl-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            aria-label={m.sample_select({ name: row.original.name })}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(next) => row.toggleSelected(next === true)}
          />
        </label>
      ),
      meta: { className: `sticky left-0 w-10 ${STICKY_CELL_BACKGROUND}` },
    },
    {
      id: "name",
      header: () => m.card_field_name(),
      cell: ({ row }) => (
        <Link
          to="/samples/$igsn"
          params={{ igsn: row.original.igsn }}
          className="text-primary block font-semibold hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <TruncatedText highlight>{row.original.name}</TruncatedText>
        </Link>
      ),
      meta: { className: `sticky left-10 w-48 ${STICKY_CELL_BACKGROUND}` },
    },
    {
      id: "igsn",
      header: () => m.card_field_igsn(),
      cell: ({ row }) => (
        <TruncatedText truncate="start" highlight="exact">
          {row.original.igsn}
        </TruncatedText>
      ),
      meta: { className: "w-28" },
    },
    ...[
      ...(fields.includes("internalNumber") ? [INTERNAL_NUMBER_COLUMN] : []),
      ...CARD_COLUMNS,
      ...selectedCardFields(fields).map((field) => ({
        id: field.key,
        label: field.label,
        text: field.get,
      })),
    ].map(textColumn),
  ];
}

export function SampleTable({
  samples,
  query = "",
  fields,
  selection,
  onSelectionChange,
  maxSelected,
}: {
  samples: PublicListedSample[];
  query?: string;
  fields: string[];
  selection: RowSelectionState;
  onSelectionChange: OnChangeFn<RowSelectionState>;
  maxSelected: number;
}) {
  const navigate = useNavigate();
  const isCapReached = Object.keys(selection).length >= maxSelected;
  const table = useReactTable({
    data: samples.filter(hasIgsn),
    columns: sampleColumns(fields, maxSelected),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (sample) => sample.igsn,
    manualPagination: true,
    enableRowSelection: (row) => row.getIsSelected() || !isCapReached,
    state: { rowSelection: selection },
    onRowSelectionChange: onSelectionChange,
  });
  const tableRef = useRef<HTMLDivElement>(null);
  useSearchHighlight(tableRef, query, [samples, fields]);

  return (
    <div ref={tableRef}>
      <DataTable
        table={table}
        className="table-fixed"
        emptyLabel=""
        onRowClick={({ igsn }) =>
          void navigate({ to: "/samples/$igsn", params: { igsn } })
        }
      />
    </div>
  );
}
