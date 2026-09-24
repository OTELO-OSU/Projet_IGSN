import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";
import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { DataTable } from "@projet-igsn/design-system/components/ui/data-table";
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
  type SortingState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CopyIcon, GitBranchPlusIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { collectionMethodLabel, natureLabel } from "#/samples/sample-labels.ts";
import { SampleStatusBadge } from "#/samples/sample-status-badge.tsx";
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

function sampleColumns(moderated: boolean): ColumnDef<AdminSampleListItem>[] {
  return [
    {
      accessorKey: "igsn",
      header: () => m.column_igsn(),
      cell: ({ row }) => row.original.igsn,
      meta: { className: "w-64" },
    },
    {
      accessorKey: "internalNumber",
      header: () => m.column_internal_id(),
      cell: ({ row }) =>
        row.original.internalNumber === null
          ? null
          : formatInternalId(row.original.internalNumber),
      meta: { className: "w-32" },
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
          {m.column_status()}
          {{ asc: " ↑", desc: " ↓" }[column.getIsSorted() as string] ?? ""}
        </button>
      ),
      cell: ({ row }) => <SampleStatusBadge status={row.original.status} />,
      meta: { className: "w-28" },
    },
    {
      accessorKey: "name",
      header: () => m.column_name(),
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
      accessorKey: "specificName",
      header: () => m.column_specific_name(),
      cell: ({ row }) =>
        row.original.specificName ? (
          <TruncatedCell text={row.original.specificName}>
            <span className="block truncate">{row.original.specificName}</span>
          </TruncatedCell>
        ) : null,
      meta: { className: "w-40" },
    },
    {
      accessorKey: "nature",
      header: () => m.column_nature(),
      cell: ({ row }) =>
        row.original.nature ? natureLabel(row.original.nature) : null,
      meta: { className: "w-36" },
    },
    {
      accessorKey: "collectionMethod",
      header: () => m.column_collection_method(),
      cell: ({ row }) =>
        row.original.collectionMethod
          ? collectionMethodLabel(row.original.collectionMethod)
          : "",
      meta: { className: "w-40" },
    },
    {
      id: "owner",
      header: () => m.column_owner(),
      cell: ({ row }) => {
        const owner = row.original.owner;
        return owner ? (
          <span className="flex items-center gap-1">
            <UserInitials name={owner.name} firstname={owner.firstname} />
            {moderated && owner.status && (
              <UserStatusBadge status={owner.status} />
            )}
          </span>
        ) : null;
      },
      meta: { className: "w-32" },
    },
    {
      accessorKey: "updatedAt",
      header: () => m.column_last_modified(),
      cell: ({ row }) => formatDate(row.original.updatedAt),
      meta: { className: "w-32" },
    },
    {
      id: "actions",
      header: () => null,
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
      meta: { className: "w-20" },
    },
  ];
}

type SampleTableProps = {
  samples: AdminSampleListItem[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  moderated?: boolean;
};

export function SampleTable({
  samples,
  sorting,
  onSortingChange,
  moderated = false,
}: SampleTableProps) {
  const navigate = useNavigate();
  const table = useReactTable({
    data: samples,
    columns: sampleColumns(moderated),
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange,
  });

  return (
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
  );
}
