import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";
import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
import { FieldPicker } from "@projet-igsn/design-system/components/ui/field-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { formatDate } from "@projet-igsn/domain/date/format-date";
import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { canDuplicateSample } from "@projet-igsn/domain/user-sample/can-duplicate-sample";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CopyIcon, GitBranchPlusIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import {
  OPTIONAL_CARD_FIELDS,
  collectorText,
  locationText,
  materialText,
  typeText,
} from "#/samples/card-fields.ts";
import { SampleStatusBadge } from "#/samples/sample-status-badge.tsx";
import { useSampleColumns } from "#/samples/use-sample-columns.ts";
import { UserInitials } from "#/users/user-initials.tsx";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";

function TruncatedCell({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

const editSampleSearch = (moderated: boolean) =>
  moderated ? { from: "moderation" as const } : {};

function RowAction({
  label,
  search,
  icon: Icon,
}: {
  label: string;
  search: { parent: string } | { duplicate: string };
  icon: typeof CopyIcon;
}) {
  return (
    <TruncatedCell text={label}>
      <Button asChild variant="ghost" size="icon">
        <Link
          to="/samples/create"
          search={search}
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
        >
          <Icon aria-hidden />
        </Link>
      </Button>
    </TruncatedCell>
  );
}

type PickableColumn = {
  id: string;
  label: () => string;
  section: () => string;
  cell: (sample: AdminSampleListItem, moderated: boolean) => ReactNode;
  className?: string;
};

function TextCell({ text }: { text: string | null }) {
  return text ? (
    <TruncatedCell text={text}>
      <span className="block truncate">{text}</span>
    </TruncatedCell>
  ) : null;
}

const LOCKED_COLUMNS = {
  igsn: { label: m.column_igsn, section: m.sample_section_sample },
  name: { label: m.column_name, section: m.sample_section_sample },
  status: { label: m.column_status, section: m.sample_section_sample },
} satisfies Partial<
  Record<
    keyof AdminSampleListItem,
    { label: () => string; section: () => string }
  >
>;

const PICKABLE_COLUMNS: readonly PickableColumn[] = [
  {
    id: "type",
    label: m.column_type,
    section: m.sample_section_sample,
    cell: (sample) => <TextCell text={typeText(sample)} />,
  },
  {
    id: "material",
    label: m.sample_field_material,
    section: m.sample_section_sample,
    cell: (sample) => <TextCell text={materialText(sample)} />,
  },
  {
    id: "location",
    label: m.column_location,
    section: m.sample_section_location,
    cell: (sample) => <TextCell text={locationText(sample.location)} />,
  },
  {
    id: "collectorName",
    label: m.column_collector,
    section: m.sample_section_scientific_context,
    cell: (sample) => <TextCell text={collectorText(sample)} />,
  },
  {
    id: "internalNumber",
    label: m.column_internal_id,
    section: m.column_section_record,
    cell: ({ internalNumber }) =>
      internalNumber === null ? null : formatInternalId(internalNumber),
    className: "w-32",
  },
  ...OPTIONAL_CARD_FIELDS.map(
    (field): PickableColumn => ({
      id: field.key,
      label: field.label,
      section: field.section,
      cell: (sample) => <TextCell text={field.get(sample)} />,
    }),
  ),
  {
    id: "owner",
    label: m.column_owner,
    section: m.column_section_record,
    cell: ({ owner }, moderated) =>
      owner ? (
        <span className="flex items-center gap-1">
          <UserInitials name={owner.name} firstname={owner.firstname} />
          {moderated && owner.status && (
            <UserStatusBadge status={owner.status} />
          )}
        </span>
      ) : null,
    className: "w-32",
  },
  {
    id: "updatedAt",
    label: m.column_last_modified,
    section: m.column_section_record,
    cell: ({ updatedAt }) => formatDate(updatedAt),
    className: "w-32",
  },
  {
    id: "publishedAt",
    label: m.column_published,
    section: m.column_section_record,
    cell: ({ publishedAt }) => (publishedAt ? formatDate(publishedAt) : null),
    className: "w-32",
  },
];

const PICKABLE_COLUMN_IDS = PICKABLE_COLUMNS.map((column) => column.id);

function sampleColumns(moderated: boolean): ColumnDef<AdminSampleListItem>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label={m.samples_select_page()}
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(checked) =>
            table.toggleAllPageRowsSelected(checked === true)
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={m.sample_select({ name: row.original.name })}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          onClick={(event) => event.stopPropagation()}
        />
      ),
      meta: { className: "w-10" },
    },
    {
      accessorKey: "igsn",
      header: () => LOCKED_COLUMNS.igsn.label(),
      cell: ({ row }) =>
        row.original.igsn ? (
          <TruncatedCell text={row.original.igsn}>
            <span dir="rtl" className="block truncate text-left">
              {row.original.igsn}
            </span>
          </TruncatedCell>
        ) : null,
      meta: { className: "w-28" },
    },
    {
      accessorKey: "name",
      header: () => LOCKED_COLUMNS.name.label(),
      cell: ({ row }) => (
        <TruncatedCell text={row.original.name}>
          <Link
            to="/samples/$sampleId"
            params={{ sampleId: row.original.id }}
            search={editSampleSearch(moderated)}
            className="block truncate hover:underline"
          >
            {row.original.name}
          </Link>
        </TruncatedCell>
      ),
      meta: { className: "w-48" },
    },
    {
      accessorKey: "status",
      enableSorting: true,
      sortDescFirst: false,
      header: ({ column }) => (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="cursor-pointer"
        >
          {LOCKED_COLUMNS.status.label()}
          {{ asc: " ↑", desc: " ↓" }[column.getIsSorted() as string] ?? ""}
        </button>
      ),
      cell: ({ row }) => <SampleStatusBadge status={row.original.status} />,
      meta: { className: "w-28" },
    },
    ...PICKABLE_COLUMNS.map(
      (column): ColumnDef<AdminSampleListItem> => ({
        id: column.id,
        header: () => column.label(),
        cell: ({ row }) => column.cell(row.original, moderated),
        meta: { className: column.className ?? "w-40" },
      }),
    ),
    {
      id: "actions",
      header: () => m.column_actions(),
      cell: ({ row }) => (
        <span className="flex items-center">
          {hasPermanentIgsn(row.original) ? (
            <RowAction
              label={m.sample_add_sub_sample({ name: row.original.name })}
              search={{ parent: row.original.id }}
              icon={GitBranchPlusIcon}
            />
          ) : null}
          {canDuplicateSample(row.original) ? (
            <RowAction
              label={m.sample_duplicate({ name: row.original.name })}
              search={{ duplicate: row.original.id }}
              icon={CopyIcon}
            />
          ) : null}
        </span>
      ),
      meta: {
        className:
          "sticky right-0 w-20 bg-background [tr:hover_&]:bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-background))]",
      },
    },
  ];
}

type SampleTableProps = {
  samples: AdminSampleListItem[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  moderated?: boolean;
};

export function SampleTable({
  samples,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  moderated = false,
}: SampleTableProps) {
  const navigate = useNavigate();
  const { columns, saveColumns } = useSampleColumns(PICKABLE_COLUMN_IDS);
  const table = useReactTable({
    data: samples,
    columns: sampleColumns(moderated),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (sample) => sample.id,
    manualSorting: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility: Object.fromEntries(
        PICKABLE_COLUMN_IDS.map((id) => [id, columns.includes(id)]),
      ),
    },
    onSortingChange,
    onRowSelectionChange,
  });

  return (
    <>
      <div className="flex justify-end">
        <FieldPicker
          fields={[
            ...Object.entries(LOCKED_COLUMNS).map(([id, column]) => ({
              id,
              ...column,
              locked: true,
            })),
            ...PICKABLE_COLUMNS.map((column) => ({ ...column, locked: false })),
          ].map(({ id, label, section, locked }) => ({
            key: id,
            label: label(),
            section: section(),
            locked,
          }))}
          selected={columns}
          onSelectedChange={saveColumns}
          triggerLabel={m.sample_columns_trigger()}
          legend={m.sample_columns_legend()}
        />
      </div>
      <DataTable
        table={table}
        className="table-fixed"
        emptyLabel={m.samples_empty()}
        onRowClick={(sample) =>
          void navigate({
            to: "/samples/$sampleId",
            params: { sampleId: sample.id },
            search: editSampleSearch(moderated),
          })
        }
      />
    </>
  );
}
