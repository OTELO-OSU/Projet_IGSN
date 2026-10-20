import { type SortingState } from "@tanstack/react-table";

import type { SampleSelection } from "#/samples/use-sample-selection.ts";
import type { SampleListParams } from "#/samples/use-samples.ts";

import { Pagination } from "#/pagination/pagination.tsx";
import { m } from "#/paraglide/messages.js";
import { SampleBulkActionBar } from "#/samples/sample-bulk-action-bar.tsx";
import { SampleTable } from "#/samples/sample-table.tsx";
import { useSamples } from "#/samples/use-samples.ts";

type SampleListPanelProps = {
  params: SampleListParams;
  update: (next: Partial<SampleListParams>) => void;
  selection: SampleSelection;
  moderated?: boolean;
};

export function SampleListPanel({
  params,
  update,
  selection,
  moderated = false,
}: SampleListPanelProps) {
  const { page, perPage, sort, order } = params;
  const query = useSamples(params, moderated);
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const labels = (query.data?.data ?? []).flatMap(({ id, igsn, name }) =>
    selection.rowSelection[id] && igsn ? [{ id, igsn, name }] : [],
  );

  const sorting: SortingState = sort
    ? [{ id: sort, desc: order === "desc" }]
    : [];

  return (
    <>
      {query.isPending ? (
        <p>{m.samples_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.samples_error()}</p>
      ) : (
        <SampleTable
          samples={query.data.data}
          moderated={moderated}
          query={params.search ?? ""}
          rowSelection={selection.rowSelection}
          onRowSelectionChange={selection.onRowSelectionChange}
          sorting={sorting}
          onSortingChange={(updater) => {
            const next =
              typeof updater === "function" ? updater(sorting) : updater;
            update({
              page: 1,
              sort: next[0] ? "status" : undefined,
              order: next[0]?.desc ? "desc" : "asc",
            });
          }}
        />
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        onPageChange={(nextPage) => update({ page: nextPage })}
        onPerPageChange={(nextPerPage) =>
          update({ page: 1, perPage: nextPerPage })
        }
      />

      {selection.ids.length > 0 ? (
        <SampleBulkActionBar
          count={selection.isAllSelected ? total : selection.ids.length}
          isAllSelected={selection.isAllSelected}
          exportRequest={selection.exportRequest}
          labels={labels}
          onSelectAll={selection.selectAll}
          onClear={selection.clear}
        />
      ) : null}
    </>
  );
}
